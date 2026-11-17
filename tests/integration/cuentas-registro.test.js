import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createContainer } from '../../src/container.js';
import { openDb } from '../../src/shared/db.js';
import { AppError } from '../../src/shared/errors.js';

const ORIGIN = 'http://localhost:3000';
const PASSWORD = 'Clave-segura-99';

function setup(t) {
  const db = openDb(':memory:');
  const config = loadConfig({
    APP_ENV: 'test',
    DATABASE_FILE: ':memory:',
    ARGON2_MEMORY_KIB: '8',
    ARGON2_TIME_COST: '1',
  });
  const container = createContainer(config, { db });
  t.after(() => container.close());
  return { db, container, app: createApp(container) };
}

function input(changes = {}) {
  return {
    displayName: 'Ana Quispe',
    email: 'ana@example.test',
    password: PASSWORD,
    passwordConfirm: PASSWORD,
    ...changes,
  };
}

function fieldError(code, field) {
  return (error) => error instanceof AppError
    && error.code === code
    && (!field || error.fieldErrors?.[field]?.length > 0);
}

test('TM-CTA-01: registro válido crea fila con hash argon2id distinto de la contraseña', async (t) => {
  const { db, container } = setup(t);
  const { userId } = await container.accounts.registerUser(input());
  assert.ok(userId > 0);
  const row = db.prepare('SELECT email, display_name, password_hash FROM users WHERE id = ?').get(userId);
  assert.equal(row.email, 'ana@example.test');
  assert.equal(row.display_name, 'Ana Quispe');
  assert.match(row.password_hash, /^\$argon2id\$/);
  assert.notEqual(row.password_hash, PASSWORD);
});

test('TM-CTA-02: dos usuarios con la misma contraseña tienen hashes distintos', async (t) => {
  const { db, container } = setup(t);
  const a = await container.accounts.registerUser(input({ email: 'uno@example.test' }));
  const b = await container.accounts.registerUser(input({ email: 'dos@example.test', displayName: 'Luis Pérez' }));
  const ha = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(a.userId).password_hash;
  const hb = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(b.userId).password_hash;
  assert.notEqual(ha, hb);
});

test('TM-CTA-03: cada regla incumplida no inserta y marca su campo', async (t) => {
  const { db, container } = setup(t);
  const cases = [
    [{ displayName: 'A' }, 'displayName'],
    [{ email: 'malo' }, 'email'],
    [{ password: 'corta', passwordConfirm: 'corta' }, 'password'],
    [{ password: 'ana@example.test', passwordConfirm: 'ana@example.test' }, 'password'],
    [{ password: 'password123', passwordConfirm: 'password123' }, 'password'],
    [{ passwordConfirm: 'otra-clave-xx' }, 'passwordConfirm'],
  ];
  for (const [changes, field] of cases) {
    await assert.rejects(
      () => container.accounts.registerUser(input(changes)),
      fieldError('VALIDATION_ERROR', field),
      field,
    );
  }
  assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n, 0);
});

test('TM-CTA-04: correo duplicado (también con otra capitalización) → EMAIL_TAKEN', async (t) => {
  const { db, container, app } = setup(t);
  await container.accounts.registerUser(input({ email: 'Ana@Example.TEST' }));
  assert.equal(db.prepare('SELECT email FROM users').get().email, 'ana@example.test');

  await assert.rejects(
    () => container.accounts.registerUser(input({ email: 'ana@example.test' })),
    fieldError('EMAIL_TAKEN', 'email'),
  );

  const res = await request(app).post('/registro').set('Origin', ORIGIN).type('form')
    .send(input({ email: 'ANA@example.test' }));
  assert.equal(res.status, 409);
  assert.match(res.text, /correo/i);
  assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n, 1);
  assert.doesNotMatch(res.text, new RegExp(PASSWORD));
});

test('TM-CTA-05: POST /registro sin Origin válido → 403 y sin fila', async (t) => {
  const { db, app } = setup(t);
  const res = await request(app).post('/registro').type('form').send(input());
  assert.equal(res.status, 403);
  assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n, 0);
});

test('POST /registro válido redirige a ingreso y no inicia sesión', async (t) => {
  const { db, app } = setup(t);
  const res = await request(app).post('/registro').set('Origin', ORIGIN).type('form').send(input());
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/ingreso?aviso=cuenta-creada');
  assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n, 1);
  assert.equal(res.headers['set-cookie'], undefined);
});
