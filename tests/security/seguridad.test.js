import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createContainer } from '../../src/container.js';
import { createHttpServer } from '../../src/server.js';
import { fixedClock } from '../../src/shared/clock.js';
import { openDb } from '../../src/shared/db.js';
import { connect } from '../helpers/ws.js';

const START = Date.UTC(2026, 10, 17, 15, 0, 0);
const PASSWORD = 'Clave-segura-99';
const EVIL_ORIGIN = 'https://atacante.example';

async function setup(t, env = {}, { live = false } = {}) {
  const db = openDb(':memory:');
  const config = loadConfig({
    APP_ENV: 'test', DATABASE_FILE: ':memory:',
    ARGON2_MEMORY_KIB: '8', ARGON2_TIME_COST: '1', ARGON2_PARALLELISM: '1',
    ...env,
  });
  const container = createContainer(config, {
    db, clock: fixedClock(START), logger: { error() {} },
  });
  const app = createApp(container);
  let server;
  let url;
  if (live) {
    server = createHttpServer(app, container);
    server.httpServer.listen(0, '127.0.0.1');
    await once(server.httpServer, 'listening');
    url = `http://127.0.0.1:${server.httpServer.address().port}`;
  }
  t.after(async () => {
    if (server) await new Promise((resolve) => server.io.close(resolve));
    container.close();
    db.close();
  });
  return {
    app, container, db, config, origin: config.appOrigin, url,
    http: () => request(url ?? app),
  };
}

async function register(ctx, email, displayName, password = PASSWORD) {
  const response = await ctx.http().post('/registro').set('Origin', ctx.origin).type('form')
    .send({ displayName, email, password, passwordConfirm: password });
  assert.equal(response.status, 302, `registro de ${email}`);
  return ctx.db.prepare('SELECT id, email, display_name, password_hash FROM users WHERE email = ?').get(email);
}

async function signIn(ctx, email, password = PASSWORD) {
  const response = await ctx.http().post('/ingreso').set('Origin', ctx.origin).type('form')
    .send({ email, password });
  assert.equal(response.status, 302, `ingreso de ${email}`);
  return response.headers['set-cookie'][0].split(';')[0];
}

function csrfFrom(html) {
  const token = /name="_csrf" value="([^"]+)"/.exec(html)?.[1];
  assert.ok(token, 'el formulario debe contener _csrf');
  return token;
}

function validOffer(changes = {}) {
  return {
    title: 'Ruta comunitaria segura',
    description: 'Descripción suficientemente extensa para una oferta válida.',
    province: 'PICHINCHA',
    locationText: 'Centro comunitario',
    startsAt: '2026-11-20T10:00',
    capacity: '12',
    ...changes,
  };
}

test('TM-SEG-01: Argon2id usa sal y nunca guarda la contraseña', async (t) => {
  const ctx = await setup(t);
  const first = await register(ctx, 'hash.ana@example.test', 'Ana Hash');
  const second = await register(ctx, 'hash.luis@example.test', 'Luis Hash');
  for (const row of [first, second]) {
    assert.match(row.password_hash, /^\$argon2id\$/);
    assert.ok(!row.password_hash.includes(PASSWORD));
  }
  assert.notEqual(first.password_hash, second.password_hash, 'la sal debe producir hashes distintos');
});

test('TM-SEG-02: validación del servidor rechaza cuenta y oferta inválidas sin JavaScript', async (t) => {
  const ctx = await setup(t);
  const badAccount = await ctx.http().post('/registro').set('Origin', ctx.origin).type('form').send({
    displayName: 'A', email: 'correo-inválido', password: 'corta', passwordConfirm: 'otra',
  });
  assert.equal(badAccount.status, 422);
  assert.equal(ctx.db.prepare('SELECT count(*) AS n FROM users').get().n, 0);

  await register(ctx, 'valida@example.test', 'Cuenta Válida');
  const cookie = await signIn(ctx, 'valida@example.test');
  const form = await ctx.http().get('/panel/ofertas/nueva').set('Cookie', cookie);
  const badOffer = await ctx.http().post('/panel/ofertas').set('Origin', ctx.origin).set('Cookie', cookie)
    .type('form').send({
      _csrf: csrfFrom(form.text), title: 'x', description: 'corta', province: 'DESCONOCIDA',
      locationText: 'x', startsAt: 'fecha', capacity: '0',
    });
  assert.equal(badOffer.status, 422);
  assert.equal(ctx.db.prepare('SELECT count(*) AS n FROM offers').get().n, 0);
});

test('TM-SEG-03: todas las rutas privadas rechazan una petición sin sesión', async (t) => {
  const ctx = await setup(t);
  const pages = [
    '/panel', '/panel/ofertas', '/panel/ofertas/nueva', '/panel/ofertas/999',
    '/panel/ofertas/999/editar', '/panel/ofertas/999/eliminar', '/panel/ofertas/999/foto', '/panel/chat',
  ];
  for (const path of pages) {
    const response = await ctx.http().get(path);
    assert.equal(response.status, 302, path);
    assert.match(response.headers.location, /^\/ingreso\?next=/, path);
  }
  const api = await ctx.http().get('/api/chat/mensajes');
  assert.equal(api.status, 401);
  assert.equal(api.body.error.code, 'UNAUTHENTICATED');
});

test('TM-SEG-04: ofertas y salir exigen origen exacto y CSRF sin producir efectos', async (t) => {
  const ctx = await setup(t);
  await register(ctx, 'csrf@example.test', 'Cuenta CSRF');
  const cookie = await signIn(ctx, 'csrf@example.test');
  const panel = await ctx.http().get('/panel').set('Cookie', cookie);
  const csrf = csrfFrom(panel.text);

  for (const headers of [
    { Cookie: cookie },
    { Cookie: cookie, Origin: EVIL_ORIGIN },
    { Cookie: cookie, Origin: ctx.origin, omitCsrf: true },
  ]) {
    const mutation = ctx.http().post('/panel/ofertas').set('Cookie', headers.Cookie);
    if (headers.Origin !== undefined) mutation.set('Origin', headers.Origin);
    const response = await mutation.type('form')
      .send({ ...validOffer(), _csrf: headers.omitCsrf ? '' : csrf });
    assert.equal(response.status, 403);
  }
  assert.equal(ctx.db.prepare('SELECT count(*) AS n FROM offers').get().n, 0);

  const noOrigin = await ctx.http().post('/salir').set('Cookie', cookie).type('form').send({ _csrf: csrf });
  const evil = await ctx.http().post('/salir').set('Cookie', cookie).set('Origin', EVIL_ORIGIN)
    .type('form').send({ _csrf: csrf });
  const noToken = await ctx.http().post('/salir').set('Cookie', cookie).set('Origin', ctx.origin).type('form').send({});
  assert.deepEqual([noOrigin.status, evil.status, noToken.status], [403, 403, 403]);
  assert.equal((await ctx.http().get('/panel').set('Cookie', cookie)).status, 200);
});

test('TM-SEG-05: ofertas y chat escapan XSS y ESLint prohíbe innerHTML', async (t) => {
  const ctx = await setup(t);
  const user = await register(ctx, 'xss@example.test', 'Cuenta XSS');
  const cookie = await signIn(ctx, 'xss@example.test');
  const form = await ctx.http().get('/panel/ofertas/nueva').set('Cookie', cookie);
  const title = '<img src=x onerror=alert(1)>';
  const description = '<script>alert(1)</script> contenido comunitario seguro.';
  const created = await ctx.http().post('/panel/ofertas').set('Cookie', cookie).set('Origin', ctx.origin)
    .type('form').send({ ...validOffer({ title, description }), _csrf: csrfFrom(form.text) });
  assert.equal(created.status, 302);
  const list = await ctx.http().get('/panel/ofertas').set('Cookie', cookie);
  assert.match(list.text, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(list.text, /<img src=x onerror=alert\(1\)>/);

  const chatPayload = '<script>alert("chat")</script>';
  ctx.container.chat.postMessage(
    { userId: user.id, displayName: user.display_name },
    { clientMessageId: randomUUID(), text: chatPayload },
  );
  const chat = await ctx.http().get('/panel/chat').set('Cookie', cookie);
  assert.match(chat.text, /&lt;script&gt;alert/);
  assert.ok(!chat.text.includes(chatPayload));

  const eslint = readFileSync(new globalThis.URL('../../eslint.config.js', import.meta.url), 'utf8');
  assert.match(eslint, /property: 'innerHTML'/);
  const publicJs = new globalThis.URL('../../public/js/', import.meta.url);
  for (const name of readdirSync(publicJs)) {
    if (name.endsWith('.js')) {
      assert.doesNotMatch(readFileSync(new globalThis.URL(name, publicJs), 'utf8'), /\.innerHTML\s*=/, name);
    }
  }
});

test('TM-SEG-06: cargas de inyección SQL no dan acceso ajeno ni dañan tablas', async (t) => {
  const ctx = await setup(t);
  const owner = await register(ctx, 'owner@example.test', 'Dueño Seguro');
  const victim = await register(ctx, 'victim@example.test', 'Otro Dueño');
  const cookie = await signIn(ctx, owner.email);
  ctx.container.offers.createOffer(
    { userId: victim.id }, validOffer({ title: 'Oferta privada de la víctima' }),
  );

  const provinceAttack = encodeURIComponent("PICHINCHA' OR 1=1 --");
  const pageAttack = encodeURIComponent('1 OR 1=1');
  const list = await ctx.http().get(`/panel/ofertas?provincia=${provinceAttack}&pagina=${pageAttack}`)
    .set('Cookie', cookie);
  assert.equal(list.status, 200);
  assert.doesNotMatch(list.text, /Oferta privada de la víctima/);

  const login = await ctx.http().post('/ingreso').set('Origin', ctx.origin).type('form')
    .send({ email: "' OR 1=1 --", password: "' OR 1=1 --" });
  assert.ok([401, 422].includes(login.status));

  const form = await ctx.http().get('/panel/ofertas/nueva').set('Cookie', cookie);
  const literalTitle = "Ruta'); DROP TABLE users;--";
  const literal = await ctx.http().post('/panel/ofertas').set('Cookie', cookie).set('Origin', ctx.origin)
    .type('form').send({
      ...validOffer({ title: literalTitle, description: "Texto'); DROP TABLE offers;-- contenido seguro." }),
      _csrf: csrfFrom(form.text),
    });
  assert.equal(literal.status, 302);
  assert.equal(ctx.db.prepare('SELECT title FROM offers WHERE owner_id = ?').get(owner.id).title, literalTitle);

  const badProvince = await ctx.http().post('/panel/ofertas').set('Cookie', cookie).set('Origin', ctx.origin)
    .type('form').send({ ...validOffer({ province: "PICHINCHA'); DROP TABLE offers;--" }), _csrf: csrfFrom(form.text) });
  assert.equal(badProvince.status, 422);
  assert.equal(ctx.db.prepare('SELECT count(*) AS n FROM users').get().n, 2);
  assert.equal(ctx.db.prepare('SELECT count(*) AS n FROM offers').get().n, 2);
  assert.equal(ctx.db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('users','offers')").get().n, 2);
});

test('TM-SEG-07: WebSocket rechaza autenticación, origen, cargas inválidas y sesión revocada', async (t) => {
  const ctx = await setup(t, {}, { live: true });
  const user = await register(ctx, 'socket@example.test', 'Cuenta Socket');
  const cookie = await signIn(ctx, user.email);
  const before = ctx.db.prepare('SELECT count(*) AS n FROM chat_messages').get().n;

  const anonymous = connect({ url: ctx.url, origin: ctx.origin });
  t.after(() => anonymous.disconnect());
  await assert.rejects(anonymous.waitForConnection(), (error) => error.data?.code === 'UNAUTHENTICATED');

  const hostile = connect({ url: ctx.url, cookie, origin: EVIL_ORIGIN });
  t.after(() => hostile.disconnect());
  await assert.rejects(hostile.waitForConnection(), (error) => error.data?.code === 'ORIGIN_MISMATCH');

  const socket = connect({ url: ctx.url, cookie, origin: ctx.origin });
  t.after(() => socket.disconnect());
  await socket.waitForConnection();
  for (const text of [{ objeto: true }, 'x'.repeat(600)]) {
    const ack = await socket.timeout(1_000).emitWithAck('chat:send', { clientMessageId: randomUUID(), text });
    assert.equal(ack.ok, false);
    assert.equal(ack.error.code, 'VALIDATION_ERROR');
  }
  assert.equal(ctx.db.prepare('SELECT count(*) AS n FROM chat_messages').get().n, before);

  ctx.db.prepare("UPDATE sessions SET revoked_at = ?, revoke_reason = 'LOGOUT' WHERE user_id = ?")
    .run(START, user.id);
  const closed = once(socket, 'disconnect');
  const revoked = await socket.timeout(1_000).emitWithAck('chat:send', {
    clientMessageId: randomUUID(), text: 'No debe persistirse',
  });
  await closed;
  assert.equal(revoked.ok, false);
  assert.equal(revoked.error.code, 'UNAUTHENTICATED');
  assert.equal(ctx.db.prepare('SELECT count(*) AS n FROM chat_messages').get().n, before);
});

test('TM-SEG-08: la cookie local y la segura tienen todos sus atributos', async (t) => {
  const local = await setup(t);
  await register(local, 'cookie.local@example.test', 'Cookie Local');
  const localResponse = await local.http().post('/ingreso').set('Origin', local.origin).type('form')
    .send({ email: 'cookie.local@example.test', password: PASSWORD });
  const localCookie = localResponse.headers['set-cookie'][0];
  assert.match(localCookie, /^tc_session=/);
  assert.match(localCookie, /HttpOnly/i);
  assert.match(localCookie, /SameSite=Lax/i);
  assert.match(localCookie, /Path=\//);
  assert.doesNotMatch(localCookie, /; Secure/i);
  assert.doesNotMatch(localCookie, /Domain=/i);

  const secure = await setup(t, {
    APP_ORIGIN: 'https://seguro.example', COOKIE_SECURE: 'true',
    CSRF_SECRET: 'secreto-ficticio-de-prueba-con-32-caracteres',
  });
  await register(secure, 'cookie.secure@example.test', 'Cookie Segura');
  const secureResponse = await secure.http().post('/ingreso').set('Origin', secure.origin).type('form')
    .send({ email: 'cookie.secure@example.test', password: PASSWORD });
  const secureCookie = secureResponse.headers['set-cookie'][0];
  assert.match(secureCookie, /^__Host-tc_session=/);
  assert.match(secureCookie, /HttpOnly/i);
  assert.match(secureCookie, /SameSite=Lax/i);
  assert.match(secureCookie, /; Secure/i);
  assert.match(secureCookie, /Path=\//);
  assert.doesNotMatch(secureCookie, /Domain=/i);
});

test('TM-SEG-09: .env está ignorado y .env.example coincide con la configuración sin secretos reales', () => {
  const root = fileURL('../../', import.meta.url);
  assert.equal(execFileSync('git', ['check-ignore', '.env'], { cwd: root, encoding: 'utf8' }).trim(), '.env');
  assert.throws(() => execFileSync('git', ['ls-files', '--error-unmatch', '.env'], { cwd: root, stdio: 'pipe' }));

  const example = readFileSync(new globalThis.URL('../../.env.example', import.meta.url), 'utf8');
  const entries = new Map(example.split(/\r?\n/).filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line))
    .map((line) => line.split(/=(.*)/s).slice(0, 2)));
  const expected = [
    'PORT', 'BIND_HOST', 'APP_ENV', 'APP_ORIGIN', 'DATABASE_FILE', 'WHATSAPP_BOOKING_NUMBER',
    'SESSION_TTL_HOURS', 'COOKIE_SECURE', 'TRUST_PROXY', 'CSRF_SECRET',
    'ARGON2_MEMORY_KIB', 'ARGON2_TIME_COST', 'ARGON2_PARALLELISM',
    'DEMO_MAILBOX_ENABLED', 'DEMO_MAILBOX_PASSWORD', 'SEED_DEMO_PASSWORD',
  ];
  assert.deepEqual([...entries.keys()], expected);
  assert.match(entries.get('APP_ORIGIN'), /^http:\/\/localhost:/);
  assert.match(entries.get('CSRF_SECRET'), /^ejemplo-/);
  assert.match(entries.get('DEMO_MAILBOX_PASSWORD'), /^ejemplo-/);
  assert.match(entries.get('SEED_DEMO_PASSWORD'), /^ejemplo-/);

  const source = readFileSync(new globalThis.URL('../../src/config.js', import.meta.url), 'utf8');
  for (const key of expected) assert.ok(source.includes(key), `src/config.js debe leer ${key}`);
});

test('TM-SEG-10: Helmet entrega CSP, nosniff y protección contra marcos', async (t) => {
  const ctx = await setup(t);
  const response = await ctx.http().get('/');
  assert.equal(response.status, 200);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.match(response.headers['content-security-policy'], /default-src 'self'/);
  assert.match(response.headers['content-security-policy'], /script-src 'self'/);
  assert.match(response.headers['content-security-policy'], /frame-ancestors 'none'/);
  assert.ok(['DENY', 'SAMEORIGIN'].includes(response.headers['x-frame-options']));
});

function fileURL(relative, base) {
  return fileURLToPath(new globalThis.URL(relative, base));
}
