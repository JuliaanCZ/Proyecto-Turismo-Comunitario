import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { appendFileSync, cpSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';
import { openDb, withTransaction } from '../../src/shared/db.js';
import { defaultMigrationsDir, migrate } from '../../src/shared/migrate.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const VERSIONS = ['001_base', '010_accounts', '020_offers', '030_chat'];

const PROVINCES = [
  'AZUAY', 'BOLIVAR', 'CANAR', 'CARCHI', 'CHIMBORAZO', 'COTOPAXI', 'EL_ORO', 'ESMERALDAS',
  'GALAPAGOS', 'GUAYAS', 'IMBABURA', 'LOJA', 'LOS_RIOS', 'MANABI', 'MORONA_SANTIAGO', 'NAPO',
  'ORELLANA', 'PASTAZA', 'PICHINCHA', 'SANTA_ELENA', 'SANTO_DOMINGO_DE_LOS_TSACHILAS',
  'SUCUMBIOS', 'TUNGURAHUA', 'ZAMORA_CHINCHIPE',
];

const CHECK = /CHECK constraint failed/;
const FOREIGN_KEY = /FOREIGN KEY constraint failed/;
const UNIQUE = /UNIQUE constraint failed/;

// --- utilidades -------------------------------------------------------------

function memoryDb(t) {
  const db = openDb(':memory:');
  t.after(() => db.close());
  migrate(db);
  return db;
}

function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), 'tc-b02-'));
  t.after(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5 }));
  return dir;
}

function insert(db, table, row) {
  const columns = Object.keys(row);
  const marks = columns.map(() => '?').join(', ');
  return db
    .prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${marks})`)
    .run(...Object.values(row));
}

function rejects(db, table, row, pattern) {
  assert.throws(() => insert(db, table, row), pattern, `${table}: ${JSON.stringify(row).slice(0, 120)}`);
}

let sequence = 0;
const unique = () => `${Date.now()}-${(sequence += 1)}`;

const userRow = (over = {}) => ({
  email: `u${unique()}@example.test`,
  display_name: 'Ana Perez',
  password_hash: '$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA',
  created_at: 1_000,
  ...over,
});
const addUser = (db, over) => Number(insert(db, 'users', userRow(over)).lastInsertRowid);

const offerRow = (ownerId, over = {}) => ({
  owner_id: ownerId,
  title: 'Caminata al volcán',
  description: 'Recorrido guiado por la comunidad con almuerzo típico.',
  province: 'COTOPAXI',
  location_text: 'Comunidad Quilotoa',
  starts_at: 5_000,
  capacity: 10,
  created_at: 1_000,
  updated_at: 1_000,
  ...over,
});
const addOffer = (db, ownerId, over) => Number(insert(db, 'offers', offerRow(ownerId, over)).lastInsertRowid);

const photoRow = (offerId, over = {}) => ({
  offer_id: offerId,
  content_type: 'image/jpeg',
  alt_text: 'Vista del volcán al amanecer',
  image_bytes: Buffer.from([0xff, 0xd8, 0xff]),
  ...over,
});

const messageRow = (authorId, over = {}) => ({
  author_id: authorId,
  author_name: 'Ana Perez',
  text: 'Hola a todos',
  client_message_id: `m-${unique()}`,
  created_at: 1_000,
  ...over,
});

const sessionRow = (userId, over = {}) => ({
  id: randomUUID(),
  user_id: userId,
  token_hash: randomBytes(32).toString('hex'),
  created_at: 1_000,
  expires_at: 2_000,
  ...over,
});

const count = (db, table) => db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;
const names = (rows) => rows.map((row) => row.name);

function queryPlan(db, sql, ...params) {
  return db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...params).map((row) => row.detail).join(' | ');
}

// --- openDb / withTransaction ----------------------------------------------

test('B0.2: openDb activa claves foráneas y busy_timeout, y WAL solo en archivo', (t) => {
  const memory = openDb(':memory:');
  t.after(() => memory.close());
  assert.equal(memory.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
  assert.equal(memory.prepare('PRAGMA busy_timeout').get().timeout, 5000);
  assert.equal(memory.prepare('PRAGMA journal_mode').get().journal_mode, 'memory');

  const file = openDb(join(tempDir(t), 'app.sqlite'));
  try {
    assert.equal(file.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
    assert.equal(file.prepare('PRAGMA busy_timeout').get().timeout, 5000);
    assert.equal(file.prepare('PRAGMA journal_mode').get().journal_mode, 'wal');
  } finally {
    file.close();
  }
  assert.throws(() => openDb(''), TypeError);
});

test('B0.2: withTransaction confirma, revierte y rechaza funciones asíncronas', (t) => {
  const db = openDb(':memory:');
  t.after(() => db.close());
  db.exec('CREATE TABLE t (a INTEGER NOT NULL) STRICT');

  const value = withTransaction(db, () => {
    db.prepare('INSERT INTO t VALUES (1)').run();
    return 'listo';
  });
  assert.equal(value, 'listo');
  assert.equal(count(db, 't'), 1);

  assert.throws(
    () => withTransaction(db, () => {
      db.prepare('INSERT INTO t VALUES (2)').run();
      throw new Error('falla a mitad');
    }),
    /falla a mitad/,
  );
  assert.equal(count(db, 't'), 1);
  assert.equal(db.isTransaction, false);

  assert.throws(
    () => withTransaction(db, async () => db.prepare('INSERT INTO t VALUES (3)').run()),
    /síncrona/,
  );
  assert.equal(count(db, 't'), 1);
  assert.equal(db.isTransaction, false);
});

// --- TM-DB-01 ---------------------------------------------------------------

test('TM-DB-01: las migraciones crean las tablas, columnas e índices esperados en :memory:', (t) => {
  const db = openDb(':memory:');
  t.after(() => db.close());
  assert.deepEqual(migrate(db), VERSIONS);

  const tables = names(
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all(),
  );
  assert.deepEqual(tables, [
    'chat_messages', 'mail_outbox', 'offer_photos', 'offers',
    'password_reset_tokens', 'schema_migrations', 'sessions', 'users',
  ]);

  const columns = {
    users: ['id', 'email', 'display_name', 'password_hash', 'created_at'],
    sessions: ['id', 'user_id', 'token_hash', 'created_at', 'expires_at', 'revoked_at', 'revoke_reason'],
    password_reset_tokens: ['id', 'user_id', 'token_hash', 'created_at', 'expires_at', 'used_at'],
    mail_outbox: ['id', 'to_email', 'subject', 'body', 'created_at'],
    offers: [
      'id', 'owner_id', 'title', 'description', 'province', 'location_text',
      'starts_at', 'capacity', 'is_published', 'created_at', 'updated_at',
    ],
    offer_photos: ['offer_id', 'content_type', 'alt_text', 'image_bytes'],
    chat_messages: ['id', 'room', 'author_id', 'author_name', 'text', 'client_message_id', 'created_at'],
    schema_migrations: ['version', 'checksum', 'applied_at'],
  };
  for (const [table, expected] of Object.entries(columns)) {
    assert.deepEqual(names(db.prepare(`PRAGMA table_info(${table})`).all()), expected, table);
  }

  const strict = db.prepare('PRAGMA table_list').all().filter((row) => tables.includes(row.name));
  assert.equal(strict.length, tables.length);
  assert.ok(strict.every((row) => row.strict === 1), 'todas las tablas son STRICT');

  const indexes = names(
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%' ORDER BY name").all(),
  );
  assert.deepEqual(indexes, [
    'idx_chat_room_id', 'idx_offers_owner_province_starts', 'idx_offers_owner_starts',
    'idx_offers_public_starts', 'idx_sessions_user',
    'ux_chat_messages_author_client', 'ux_password_reset_tokens_hash', 'ux_password_reset_tokens_user',
    'ux_sessions_token_hash', 'ux_users_email',
  ]);

  const indexColumns = (index) => names(db.prepare(`PRAGMA index_info(${index})`).all());
  assert.deepEqual(indexColumns('idx_offers_owner_province_starts'), ['owner_id', 'province', 'starts_at', 'id']);
  assert.deepEqual(indexColumns('idx_offers_owner_starts'), ['owner_id', 'starts_at', 'id']);
  assert.deepEqual(indexColumns('idx_offers_public_starts'), ['is_published', 'starts_at', 'id']);
  assert.deepEqual(indexColumns('idx_chat_room_id'), ['room', 'id']);
  assert.deepEqual(indexColumns('idx_sessions_user'), ['user_id']);
  assert.deepEqual(indexColumns('ux_chat_messages_author_client'), ['author_id', 'client_message_id']);

  const isUnique = (index, table) => db.prepare(`PRAGMA index_list(${table})`).all()
    .find((row) => row.name === index)?.unique;
  for (const [name, table] of [
    ['ux_users_email', 'users'], ['ux_sessions_token_hash', 'sessions'],
    ['ux_password_reset_tokens_user', 'password_reset_tokens'],
    ['ux_password_reset_tokens_hash', 'password_reset_tokens'],
    ['ux_chat_messages_author_client', 'chat_messages'],
  ]) {
    assert.equal(isUnique(name, table), 1, `${name} es único`);
  }
});

// --- TM-DB-02 ---------------------------------------------------------------

test('TM-DB-02: reejecutar el migrador no cambia nada', (t) => {
  const db = openDb(':memory:');
  t.after(() => db.close());
  const snapshot = () => ({
    migrations: db.prepare('SELECT version, checksum, applied_at FROM schema_migrations ORDER BY version').all(),
    schema: db.prepare('SELECT type, name, sql FROM sqlite_master ORDER BY type, name').all(),
  });

  assert.deepEqual(migrate(db, { now: () => 111 }), VERSIONS);
  const first = snapshot();
  assert.equal(first.migrations.length, VERSIONS.length);
  assert.ok(first.migrations.every((row) => row.applied_at === 111 && /^[0-9a-f]{64}$/.test(row.checksum)));

  assert.deepEqual(migrate(db, { now: () => 222 }), []);
  assert.deepEqual(snapshot(), first);
});

test('TM-DB-02: modificar un archivo ya aplicado hace fallar el migrador', (t) => {
  const dir = join(tempDir(t), 'migrations');
  cpSync(defaultMigrationsDir, dir, { recursive: true });
  const db = openDb(':memory:');
  t.after(() => db.close());
  migrate(db, { dir });

  appendFileSync(join(dir, '010_accounts.sql'), '\n-- cambio posterior\n');
  assert.throws(
    () => migrate(db, { dir }),
    (error) => /010_accounts\.sql/.test(error.message) && /cambió/.test(error.message)
      && /migración nueva/.test(error.message),
  );
});

test('B0.2: el checksum ignora CRLF y BOM (clones de Windows y Linux)', (t) => {
  const dir = join(tempDir(t), 'migrations');
  cpSync(defaultMigrationsDir, dir, { recursive: true });
  const db = openDb(':memory:');
  t.after(() => db.close());
  migrate(db, { dir });

  const file = join(dir, '020_offers.sql');
  writeFileSync(file, `﻿${readFileSync(file, 'utf8').replace(/\n/g, '\r\n')}`);
  assert.deepEqual(migrate(db, { dir }), []);
});

test('B0.2: una migración aplicada que desaparece del directorio es un error', (t) => {
  const dir = join(tempDir(t), 'migrations');
  cpSync(defaultMigrationsDir, dir, { recursive: true });
  const db = openDb(':memory:');
  t.after(() => db.close());
  migrate(db, { dir });

  renameSync(join(dir, '030_chat.sql'), join(dir, '030_chat.sql.bak'));
  assert.throws(() => migrate(db, { dir }), /030_chat.*no existe/);
});

test('B0.2: una migración nueva con número menor que las aplicadas se aplica, y solo ella', (t) => {
  const dir = join(tempDir(t), 'migrations');
  cpSync(defaultMigrationsDir, dir, { recursive: true });
  const db = openDb(':memory:');
  t.after(() => db.close());
  migrate(db, { dir });

  writeFileSync(join(dir, '011_perfil.sql'), 'ALTER TABLE users ADD COLUMN bio TEXT;\n');
  assert.deepEqual(migrate(db, { dir }), ['011_perfil']);
  assert.ok(names(db.prepare('PRAGMA table_info(users)').all()).includes('bio'));
  assert.deepEqual(migrate(db, { dir }), []);
});

test('B0.2: una migración que falla se revierte entera y no se registra', (t) => {
  const dir = join(tempDir(t), 'migrations');
  cpSync(defaultMigrationsDir, dir, { recursive: true });
  const db = openDb(':memory:');
  t.after(() => db.close());
  migrate(db, { dir });

  writeFileSync(
    join(dir, '040_rota.sql'),
    'CREATE TABLE parcial (a INTEGER) STRICT;\nINSERT INTO tabla_inexistente VALUES (1);\n',
  );
  assert.throws(() => migrate(db, { dir }), /tabla_inexistente/);
  assert.equal(db.isTransaction, false);
  assert.equal(db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'parcial'").get(), undefined);
  assert.equal(db.prepare("SELECT 1 FROM schema_migrations WHERE version = '040_rota'").get(), undefined);
});

test('B0.2: rechaza nombres de migración inválidos y números repetidos', (t) => {
  const base = tempDir(t);
  const invalid = join(base, 'invalid');
  cpSync(defaultMigrationsDir, invalid, { recursive: true });
  writeFileSync(join(invalid, 'Extra.sql'), 'SELECT 1;\n');
  const db = openDb(':memory:');
  t.after(() => db.close());
  assert.throws(() => migrate(db, { dir: invalid }), /Nombre de migración inválido: Extra\.sql/);

  const repeated = join(base, 'repeated');
  cpSync(defaultMigrationsDir, repeated, { recursive: true });
  writeFileSync(join(repeated, '010_otra.sql'), 'SELECT 1;\n');
  assert.throws(() => migrate(db, { dir: repeated }), /Número de migración repetido: 010_accounts\.sql y 010_otra\.sql/);
  assert.equal(db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'schema_migrations'").get(), undefined);
});

// --- TM-DB-03 ---------------------------------------------------------------

test('TM-DB-03: las claves foráneas están activas y sus ON DELETE son explícitos', (t) => {
  const db = memoryDb(t);
  rejects(db, 'offers', offerRow(999), FOREIGN_KEY);
  rejects(db, 'sessions', sessionRow(999), FOREIGN_KEY);
  rejects(db, 'password_reset_tokens', {
    user_id: 999, token_hash: 'c'.repeat(64), created_at: 1, expires_at: 2,
  }, FOREIGN_KEY);
  rejects(db, 'chat_messages', messageRow(999), FOREIGN_KEY);
  rejects(db, 'offer_photos', photoRow(999), FOREIGN_KEY);

  const owner = addUser(db);
  addOffer(db, owner);
  insert(db, 'chat_messages', messageRow(owner));
  // offers y chat_messages: RESTRICT, no se borra un usuario con datos propios.
  assert.throws(() => db.prepare('DELETE FROM users WHERE id = ?').run(owner), FOREIGN_KEY);

  // sessions y password_reset_tokens: CASCADE.
  const solo = addUser(db);
  insert(db, 'sessions', sessionRow(solo));
  insert(db, 'password_reset_tokens', { user_id: solo, token_hash: 'd'.repeat(64), created_at: 1, expires_at: 2 });
  db.prepare('DELETE FROM users WHERE id = ?').run(solo);
  assert.equal(db.prepare('SELECT count(*) AS n FROM sessions WHERE user_id = ?').get(solo).n, 0);
  assert.equal(db.prepare('SELECT count(*) AS n FROM password_reset_tokens WHERE user_id = ?').get(solo).n, 0);
});

// --- TM-DB-04 ---------------------------------------------------------------

test('TM-DB-04: UNIQUE (email) y UNIQUE (author_id, client_message_id) rechazan duplicados', (t) => {
  const db = memoryDb(t);
  const ana = addUser(db, { email: 'ana@example.test' });
  const luis = addUser(db, { email: 'luis@example.test' });
  rejects(db, 'users', userRow({ email: 'ana@example.test' }), /UNIQUE constraint failed: users\.email/);
  assert.equal(count(db, 'users'), 2);

  insert(db, 'chat_messages', messageRow(ana, { client_message_id: 'abc' }));
  rejects(
    db,
    'chat_messages',
    messageRow(ana, { client_message_id: 'abc', text: 'otro texto' }),
    /UNIQUE constraint failed: chat_messages\.author_id, chat_messages\.client_message_id/,
  );
  // Otro autor con el mismo identificador de cliente, y el mismo autor con otro identificador, sí caben.
  insert(db, 'chat_messages', messageRow(luis, { client_message_id: 'abc' }));
  insert(db, 'chat_messages', messageRow(ana, { client_message_id: 'abd' }));
  assert.equal(count(db, 'chat_messages'), 3);

  // Restantes únicos del esquema.
  const session = sessionRow(ana, { token_hash: 'e'.repeat(64) });
  insert(db, 'sessions', session);
  rejects(db, 'sessions', sessionRow(luis, { token_hash: 'e'.repeat(64) }), UNIQUE);
  insert(db, 'password_reset_tokens', { user_id: ana, token_hash: 'f'.repeat(64), created_at: 1, expires_at: 2 });
  rejects(db, 'password_reset_tokens', { user_id: ana, token_hash: '1'.repeat(64), created_at: 1, expires_at: 2 }, UNIQUE);
  rejects(db, 'password_reset_tokens', { user_id: luis, token_hash: 'f'.repeat(64), created_at: 1, expires_at: 2 }, UNIQUE);
});

// --- TM-DB-05 ---------------------------------------------------------------

test('TM-DB-05: los CHECK de ofertas rechazan capacidad, título, provincia y demás rangos', (t) => {
  const db = memoryDb(t);
  const owner = addUser(db);
  const offer = (over) => offerRow(owner, over);

  rejects(db, 'offers', offer({ capacity: 0 }), CHECK);
  rejects(db, 'offers', offer({ capacity: 1001 }), CHECK);
  rejects(db, 'offers', offer({ capacity: -3 }), CHECK);
  rejects(db, 'offers', offer({ capacity: 1.5 }), /INTEGER/);
  addOffer(db, owner, { capacity: 1 });
  addOffer(db, owner, { capacity: 1000 });

  rejects(db, 'offers', offer({ title: 'abcd' }), CHECK);
  rejects(db, 'offers', offer({ title: 'a'.repeat(121) }), CHECK);
  addOffer(db, owner, { title: 'abcde' });
  addOffer(db, owner, { title: 'a'.repeat(120) });
  // length() cuenta caracteres, no bytes ni unidades UTF-16.
  addOffer(db, owner, { title: '😀'.repeat(5) });
  addOffer(db, owner, { title: '😀'.repeat(120) });
  rejects(db, 'offers', offer({ title: '😀'.repeat(121) }), CHECK);
  rejects(db, 'offers', offer({ title: '😀'.repeat(4) }), CHECK);

  rejects(db, 'offers', offer({ description: 'a'.repeat(19) }), CHECK);
  rejects(db, 'offers', offer({ description: 'a'.repeat(2001) }), CHECK);
  addOffer(db, owner, { description: 'a'.repeat(20) });
  addOffer(db, owner, { description: 'a'.repeat(2000) });

  rejects(db, 'offers', offer({ location_text: 'abcd' }), CHECK);
  rejects(db, 'offers', offer({ location_text: 'a'.repeat(201) }), CHECK);
  addOffer(db, owner, { location_text: 'abcde' });
  addOffer(db, owner, { location_text: 'a'.repeat(200) });

  rejects(db, 'offers', offer({ province: 'ATLANTIDA' }), CHECK);
  rejects(db, 'offers', offer({ province: 'azuay' }), CHECK);
  rejects(db, 'offers', offer({ province: '' }), CHECK);
  for (const province of PROVINCES) addOffer(db, owner, { province });
  assert.equal(PROVINCES.length, 24);

  rejects(db, 'offers', offer({ is_published: 2 }), CHECK);
  rejects(db, 'offers', offer({ is_published: -1 }), CHECK);
  rejects(db, 'offers', offer({ starts_at: 'mañana' }), /INTEGER/);
  const defaulted = addOffer(db, owner);
  assert.equal(db.prepare('SELECT is_published FROM offers WHERE id = ?').get(defaulted).is_published, 0);
});

test('TM-DB-05: los CHECK de chat rechazan texto vacío, en blanco o demasiado largo', (t) => {
  const db = memoryDb(t);
  const author = addUser(db);
  const message = (over) => messageRow(author, over);

  rejects(db, 'chat_messages', message({ text: '' }), CHECK);
  for (const blank of [' ', '   ', '\t', '\n', ' \r\n\t ', ' ', ' ', '　', ' ', '﻿', '\u0085']) {
    rejects(db, 'chat_messages', message({ text: blank }), CHECK);
  }
  rejects(db, 'chat_messages', message({ text: 'a'.repeat(501) }), CHECK);
  rejects(db, 'chat_messages', message({ text: '😀'.repeat(501) }), CHECK);
  insert(db, 'chat_messages', message({ text: 'a' }));
  insert(db, 'chat_messages', message({ text: '  hola  ' }));
  insert(db, 'chat_messages', message({ text: 'a'.repeat(500) }));
  insert(db, 'chat_messages', message({ text: '😀'.repeat(500) }));
  insert(db, 'chat_messages', message({ text: ' x ' }));

  rejects(db, 'chat_messages', message({ room: 'otra' }), CHECK);
  rejects(db, 'chat_messages', message({ author_name: 'A' }), CHECK);
  rejects(db, 'chat_messages', message({ author_name: 'a'.repeat(81) }), CHECK);
  rejects(db, 'chat_messages', message({ client_message_id: '' }), CHECK);
  rejects(db, 'chat_messages', message({ client_message_id: 'a'.repeat(65) }), CHECK);
  const stored = insert(db, 'chat_messages', message());
  assert.equal(
    db.prepare('SELECT room FROM chat_messages WHERE id = ?').get(stored.lastInsertRowid).room,
    'general',
  );
});

test('TM-DB-05: los CHECK de cuentas rechazan correos, nombres, sesiones y tokens inválidos', (t) => {
  const db = memoryDb(t);

  rejects(db, 'users', userRow({ email: 'Ana@Example.test' }), CHECK);
  rejects(db, 'users', userRow({ email: 'a@' }), CHECK);
  rejects(db, 'users', userRow({ display_name: 'A' }), CHECK);
  rejects(db, 'users', userRow({ display_name: 'a'.repeat(81) }), CHECK);
  rejects(db, 'users', userRow({ password_hash: '' }), CHECK);
  addUser(db, { display_name: 'Al' });
  addUser(db, { display_name: 'a'.repeat(80) });

  const user = addUser(db);
  rejects(db, 'sessions', sessionRow(user, { expires_at: 1_000 }), CHECK);
  rejects(db, 'sessions', sessionRow(user, { expires_at: 999 }), CHECK);
  rejects(db, 'sessions', sessionRow(user, { token_hash: 'A'.repeat(64) }), CHECK);
  rejects(db, 'sessions', sessionRow(user, { token_hash: 'a'.repeat(63) }), CHECK);
  rejects(db, 'sessions', sessionRow(user, { token_hash: 'g'.repeat(64) }), CHECK);
  rejects(db, 'sessions', sessionRow(user, { id: 'corto' }), CHECK);
  rejects(db, 'sessions', sessionRow(user, { revoked_at: 1_500 }), CHECK);
  rejects(db, 'sessions', sessionRow(user, { revoke_reason: 'LOGOUT' }), CHECK);
  rejects(db, 'sessions', sessionRow(user, { revoked_at: 1_500, revoke_reason: 'OTRO' }), CHECK);
  insert(db, 'sessions', sessionRow(user, { revoked_at: 1_500, revoke_reason: 'LOGOUT' }));
  insert(db, 'sessions', sessionRow(user, { revoked_at: 1_500, revoke_reason: 'PASSWORD_RESET' }));
  insert(db, 'sessions', sessionRow(user));

  const other = addUser(db);
  rejects(db, 'password_reset_tokens', {
    user_id: other, token_hash: 'a'.repeat(64), created_at: 5, expires_at: 5,
  }, CHECK);
  rejects(db, 'password_reset_tokens', {
    user_id: other, token_hash: 'zz', created_at: 5, expires_at: 6,
  }, CHECK);
  rejects(db, 'mail_outbox', { to_email: 'x@y.test', subject: '', body: 'cuerpo', created_at: 1 }, CHECK);
  rejects(db, 'mail_outbox', { to_email: 'x@y.test', subject: 'asunto', body: '', created_at: 1 }, CHECK);
  insert(db, 'mail_outbox', { to_email: 'x@y.test', subject: 'asunto', body: 'cuerpo', created_at: 1 });

  // El prefijo $argon2id$ del hash lo comprueba la prueba del servicio de cuentas (B1.1), no el CHECK.
  const stored = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user).password_hash;
  assert.ok(stored.startsWith('$argon2id$'));
});

// --- TM-DB-05a --------------------------------------------------------------

test('TM-DB-05a: offer_photos admite una foto por oferta, valida formato, texto y tamaño, y cae en cascada', (t) => {
  const db = memoryDb(t);
  const owner = addUser(db);
  const fresh = () => addOffer(db, owner);

  const offer = fresh();
  insert(db, 'offer_photos', photoRow(offer));
  rejects(db, 'offer_photos', photoRow(offer, { alt_text: 'Otra foto' }), /UNIQUE constraint failed: offer_photos\.offer_id/);
  assert.equal(count(db, 'offer_photos'), 1);

  for (const content_type of ['image/png', 'image/webp']) {
    insert(db, 'offer_photos', photoRow(fresh(), { content_type }));
  }
  for (const content_type of ['image/gif', 'image/svg+xml', 'application/pdf', 'IMAGE/JPEG', 'image/jpeg ', '']) {
    rejects(db, 'offer_photos', photoRow(fresh(), { content_type }), CHECK);
  }

  rejects(db, 'offer_photos', photoRow(fresh(), { alt_text: '' }), CHECK);
  rejects(db, 'offer_photos', photoRow(fresh(), { alt_text: 'a'.repeat(161) }), CHECK);
  insert(db, 'offer_photos', photoRow(fresh(), { alt_text: 'a' }));
  insert(db, 'offer_photos', photoRow(fresh(), { alt_text: 'a'.repeat(160) }));
  insert(db, 'offer_photos', photoRow(fresh(), { alt_text: '😀'.repeat(160) }));
  rejects(db, 'offer_photos', photoRow(fresh(), { alt_text: '😀'.repeat(161) }), CHECK);

  const MAX = 2_097_152;
  rejects(db, 'offer_photos', photoRow(fresh(), { image_bytes: Buffer.alloc(0) }), CHECK);
  rejects(db, 'offer_photos', photoRow(fresh(), { image_bytes: Buffer.alloc(MAX + 1) }), CHECK);
  insert(db, 'offer_photos', photoRow(fresh(), { image_bytes: Buffer.alloc(1) }));
  const largest = fresh();
  insert(db, 'offer_photos', photoRow(largest, { image_bytes: Buffer.alloc(MAX) }));
  assert.equal(
    db.prepare('SELECT length(image_bytes) AS n FROM offer_photos WHERE offer_id = ?').get(largest).n,
    MAX,
  );
  // STRICT: un texto no cabe en la columna BLOB, aunque su length() cumpliera el CHECK.
  rejects(db, 'offer_photos', photoRow(fresh(), { image_bytes: 'no soy un blob' }), /BLOB/);

  // Borrar la oferta borra su foto (ON DELETE CASCADE).
  const before = count(db, 'offer_photos');
  db.prepare('DELETE FROM offers WHERE id = ?').run(offer);
  assert.equal(count(db, 'offer_photos'), before - 1);
  assert.equal(db.prepare('SELECT 1 FROM offer_photos WHERE offer_id = ?').get(offer), undefined);
});

// --- Índices: la consulta que cada uno sirve (docs/mvp/esquema.md) ---------

test('B0.2: cada índice documentado lo usa la consulta a la que sirve, sin ordenar aparte', (t) => {
  const db = memoryDb(t);
  const owner = addUser(db);
  for (let i = 0; i < 60; i += 1) {
    const id = addOffer(db, owner, { province: PROVINCES[i % 24], starts_at: 10_000 + i, is_published: i % 2 });
    if (i % 2) insert(db, 'offer_photos', photoRow(id));
  }
  db.exec('ANALYZE');

  const cases = [
    ['idx_offers_owner_province_starts',
      `SELECT id, title FROM offers WHERE owner_id = ? AND province = ? ORDER BY starts_at, id LIMIT 10 OFFSET 0`,
      [owner, 'AZUAY']],
    ['idx_offers_owner_starts',
      `SELECT id, title FROM offers WHERE owner_id = ? ORDER BY starts_at, id LIMIT 10 OFFSET 10`,
      [owner]],
    ['idx_offers_public_starts',
      `SELECT o.id, o.title FROM offers o
        WHERE o.is_published = 1 AND o.starts_at > ?
          AND EXISTS (SELECT 1 FROM offer_photos p WHERE p.offer_id = o.id)
        ORDER BY o.starts_at, o.id LIMIT 10 OFFSET 0`,
      [10_000]],
    ['idx_chat_room_id',
      `SELECT id, text FROM chat_messages WHERE room = ? AND id < ? ORDER BY id DESC LIMIT 50`,
      ['general', 100]],
    ['idx_sessions_user',
      `UPDATE sessions SET revoked_at = ?, revoke_reason = 'LOGOUT' WHERE user_id = ? AND revoked_at IS NULL`,
      [1, owner]],
    ['ux_users_email', `SELECT id, password_hash FROM users WHERE email = ?`, ['ana@example.test']],
    ['ux_sessions_token_hash', `SELECT id, user_id FROM sessions WHERE token_hash = ?`, ['a'.repeat(64)]],
    ['ux_password_reset_tokens_hash', `SELECT id FROM password_reset_tokens WHERE token_hash = ?`, ['a'.repeat(64)]],
    ['ux_chat_messages_author_client',
      `SELECT id FROM chat_messages WHERE author_id = ? AND client_message_id = ?`, [owner, 'abc']],
  ];
  for (const [index, sql, params] of cases) {
    const plan = queryPlan(db, sql, ...params);
    assert.match(plan, new RegExp(`USING (COVERING )?INDEX ${index}\\b`), `${index}: ${plan}`);
    assert.doesNotMatch(plan, /TEMP B-TREE/, `${index} no debe ordenar aparte: ${plan}`);
  }
});

// --- scripts/migrate.js sobre un archivo real -------------------------------

test('B0.2: scripts/migrate.js crea la carpeta y el archivo, y la segunda ejecución no cambia nada', (t) => {
  const file = join(tempDir(t), 'datos', 'nuevo', 'app.sqlite');
  const run = (databaseFile) => spawnSync(process.execPath, ['scripts/migrate.js'], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_FILE: databaseFile },
    encoding: 'utf8',
  });

  const first = run(file);
  assert.equal(first.status, 0, first.stderr);
  for (const version of VERSIONS) assert.match(first.stdout, new RegExp(`Aplicada ${version}\\b`));
  assert.match(first.stdout, /4 migración\(es\) aplicada\(s\)/);

  const read = (sql) => {
    const db = openDb(file);
    try {
      return db.prepare(sql).all();
    } finally {
      db.close();
    }
  };
  const rows = read('SELECT version, checksum, applied_at FROM schema_migrations ORDER BY version');
  assert.equal(rows.length, 4);

  const second = run(file);
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /sin migraciones pendientes/);
  assert.doesNotMatch(second.stdout, /Aplicada/);
  assert.deepEqual(read('SELECT version, checksum, applied_at FROM schema_migrations ORDER BY version'), rows);

  const memory = run(':memory:');
  assert.equal(memory.status, 1);
  assert.match(memory.stderr, /:memory:/);
});
