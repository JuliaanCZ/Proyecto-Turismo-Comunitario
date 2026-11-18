import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createContainer } from '../../src/container.js';
import { revokeAllInTx } from '../../src/modules/accounts/index.js';
import { fixedClock } from '../../src/shared/clock.js';
import { openDb, withTransaction } from '../../src/shared/db.js';
import { createCsrfToken } from '../../src/shared/http/csrf.js';
import { createSessionFor } from '../helpers/auth.js';
import { createUser } from '../helpers/factories.js';

const ORIGIN = 'http://localhost:3000';
const PASSWORD = 'Clave-segura-99';
const START = Date.UTC(2026, 10, 17, 15, 0, 0);
const HOUR = 3_600_000;

function setup(t, env = {}) {
  const db = openDb(':memory:');
  const clock = fixedClock(START);
  const config = loadConfig({
    APP_ENV: 'test',
    DATABASE_FILE: ':memory:',
    ARGON2_MEMORY_KIB: '8',
    ARGON2_TIME_COST: '1',
    ...env,
  });
  const container = createContainer(config, { db, clock });
  t.after(() => container.close());
  const ctx = { db, container, clock, config, app: createApp(container) };
  return ctx;
}

async function registerAna({ container }, overrides = {}) {
  return container.accounts.registerUser({
    displayName: 'Ana Quispe',
    email: 'ana@example.test',
    password: PASSWORD,
    passwordConfirm: PASSWORD,
    ...overrides,
  });
}

function extractCookiePair(res, cookieName = 'tc_session') {
  const raw = res.headers['set-cookie'];
  const header = Array.isArray(raw) ? raw.find((h) => h.startsWith(`${cookieName}=`)) : raw;
  assert.ok(header, `Set-Cookie para ${cookieName}`);
  const pair = header.split(';')[0];
  const token = pair.slice(cookieName.length + 1);
  return { header, pair, token };
}

test('TM-CTA-06: ingreso correcto fija cookie HttpOnly + SameSite=Lax y guarda solo SHA-256 en SQLite', async (t) => {
  const ctx = setup(t);
  await registerAna(ctx);

  const res = await request(ctx.app).post('/ingreso').set('Origin', ORIGIN).type('form')
    .send({ email: 'ANA@Example.test', password: PASSWORD });
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/panel');

  const { header, token } = extractCookiePair(res);
  assert.match(header, /HttpOnly/i);
  assert.match(header, /SameSite=Lax/i);
  assert.match(header, /Path=\//);
  assert.match(header, /Max-Age=28800/);
  assert.ok(token.length >= 43);

  const row = ctx.db.prepare('SELECT id, token_hash, expires_at FROM sessions').get();
  assert.equal(row.token_hash, createHash('sha256').update(token).digest('hex'));
  assert.notEqual(row.token_hash, token);
  assert.equal(row.expires_at, START + 8 * HOUR);

  // Con COOKIE_SECURE=true usa __Host-tc_session y Secure.
  const sec = setup(t, { APP_ORIGIN: 'https://turismo.example', COOKIE_SECURE: 'true' });
  await registerAna(sec);
  const resHttps = await request(sec.app).post('/ingreso')
    .set('Origin', 'https://turismo.example').type('form')
    .send({ email: 'ana@example.test', password: PASSWORD });
  assert.equal(resHttps.status, 302);
  const hostCookie = extractCookiePair(resHttps, '__Host-tc_session');
  assert.match(hostCookie.header, /Secure/i);
  assert.match(hostCookie.header, /HttpOnly/i);
  assert.match(hostCookie.header, /SameSite=Lax/i);
  assert.match(hostCookie.header, /Path=\//);
});

test('TM-CTA-07: contraseña incorrecta y correo inexistente devuelven el mismo estado y mensaje', async (t) => {
  const ctx = setup(t);
  await registerAna(ctx);

  const claveMala = await request(ctx.app).post('/ingreso').set('Origin', ORIGIN).type('form')
    .send({ email: 'ana@example.test', password: 'Clave-incorrecta-00' });
  const correoInexistente = await request(ctx.app).post('/ingreso').set('Origin', ORIGIN).type('form')
    .send({ email: 'nadie@example.test', password: 'Clave-incorrecta-00' });

  assert.equal(claveMala.status, 401);
  assert.equal(correoInexistente.status, 401);
  const extractAlert = (html) => /role="alert"[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1]?.trim();
  assert.ok(extractAlert(claveMala.text));
  assert.equal(extractAlert(claveMala.text), extractAlert(correoInexistente.text));
  assert.doesNotMatch(claveMala.text, /Clave-incorrecta-00/);
  assert.equal(ctx.db.prepare('SELECT count(*) AS n FROM sessions').get().n, 0);
});

test('TM-CTA-08: /panel sin cookie → 302 a /ingreso; con cookie válida → 200', async (t) => {
  const ctx = setup(t);
  await registerAna(ctx);

  const anon = await request(ctx.app).get('/panel');
  assert.equal(anon.status, 302);
  assert.equal(anon.headers.location, '/ingreso?next=%2Fpanel');

  const login = await request(ctx.app).post('/ingreso').set('Origin', ORIGIN).type('form')
    .send({ email: 'ana@example.test', password: PASSWORD });
  const { pair } = extractCookiePair(login);

  const panel = await request(ctx.app).get('/panel').set('Cookie', pair);
  assert.equal(panel.status, 200);
  assert.match(panel.text, /Ana Quispe/);
});

test('TM-CTA-09: POST /salir revoca la sesión, limpia la cookie, emite session-revoked y es idempotente', async (t) => {
  const ctx = setup(t);
  await registerAna(ctx);
  const events = [];
  ctx.container.sessionEvents.on('session-revoked', (payload) => events.push(payload));

  const login = await request(ctx.app).post('/ingreso').set('Origin', ORIGIN).type('form')
    .send({ email: 'ana@example.test', password: PASSWORD });
  const { pair, token } = extractCookiePair(login);
  const principal = ctx.container.accounts.resolveSession(token);
  assert.ok(principal);
  const csrf = createCsrfToken(ctx.config.csrfSecret, principal.sessionId);

  const salir1 = await request(ctx.app).post('/salir').set('Origin', ORIGIN)
    .set('Cookie', pair).type('form').send({ _csrf: csrf });
  assert.equal(salir1.status, 302);
  assert.match(salir1.headers['set-cookie'][0], /Max-Age=0/);
  assert.equal(ctx.container.accounts.resolveSession(token), null);
  assert.deepEqual(events, [{ sessionId: principal.sessionId }]);

  const panelTrasSalir = await request(ctx.app).get('/panel').set('Cookie', pair);
  assert.equal(panelTrasSalir.status, 302);
  assert.equal(panelTrasSalir.headers.location, '/ingreso?next=%2Fpanel');

  // Segunda salida (cookie ya revocada → sin principal, idempotente, mismo resultado).
  const salir2 = await request(ctx.app).post('/salir').set('Origin', ORIGIN)
    .set('Cookie', pair).type('form').send({});
  assert.equal(salir2.status, 302);
  assert.equal(salir2.headers.location, salir1.headers.location);

  // Idempotencia directa del servicio al revocar dos veces el mismo id.
  assert.deepEqual(ctx.container.accounts.revokeSession(principal.sessionId, 'LOGOUT'), { revoked: false });
});

test('TM-CTA-10: sesión vencida (reloj +8 h) no da acceso', async (t) => {
  const ctx = setup(t);
  await registerAna(ctx);

  const login = await request(ctx.app).post('/ingreso').set('Origin', ORIGIN).type('form')
    .send({ email: 'ana@example.test', password: PASSWORD });
  const { pair, token } = extractCookiePair(login);

  ctx.clock.advance(8 * HOUR);
  assert.equal(ctx.container.accounts.resolveSession(token, ctx.clock.now()), null);
  const panel = await request(ctx.app).get('/panel').set('Cookie', pair);
  assert.equal(panel.status, 302);
  assert.equal(panel.headers.location, '/ingreso?next=%2Fpanel');
});

test('TM-CTA-11: cada ingreso genera un token nuevo y nunca reutiliza la cookie presentada (sin fijación)', async (t) => {
  const ctx = setup(t);
  await registerAna(ctx);

  const fijado = 'token-fijado-por-atacante-0123456789abcdefX';
  const r1 = await request(ctx.app).post('/ingreso').set('Origin', ORIGIN)
    .set('Cookie', `tc_session=${fijado}`).type('form')
    .send({ email: 'ana@example.test', password: PASSWORD });
  const t1 = extractCookiePair(r1).token;
  assert.notEqual(t1, fijado);

  // Reingreso presentando la sesión activa (con su CSRF): emite otro token distinto.
  const p1 = ctx.container.accounts.resolveSession(t1);
  const csrf1 = createCsrfToken(ctx.config.csrfSecret, p1.sessionId);
  const r2 = await request(ctx.app).post('/ingreso').set('Origin', ORIGIN)
    .set('Cookie', `tc_session=${t1}`).type('form')
    .send({ email: 'ana@example.test', password: PASSWORD, _csrf: csrf1 });
  const t2 = extractCookiePair(r2).token;
  assert.notEqual(t2, t1);
});

test('TM-CTA-12: next hostil (https://evil.test, //evil.test) se ignora y redirige a /panel; ruta interna válida se respeta', async (t) => {
  const ctx = setup(t);
  await registerAna(ctx);

  for (const bad of ['https://evil.test', '//evil.test', '/\\evil.test', '/ingreso']) {
    const res = await request(ctx.app).post('/ingreso').set('Origin', ORIGIN).type('form')
      .send({ email: 'ana@example.test', password: PASSWORD, next: bad });
    assert.equal(res.status, 302, bad);
    assert.equal(res.headers.location, '/panel', bad);
  }

  const ok = await request(ctx.app).post('/ingreso').set('Origin', ORIGIN).type('form')
    .send({ email: 'ana@example.test', password: PASSWORD, next: '/panel/ofertas?pagina=2' });
  assert.equal(ok.status, 302);
  assert.equal(ok.headers.location, '/panel/ofertas?pagina=2');
});

test('Integración B0.5 + B1.2/B1.3: resolveSession acepta createSessionFor y revokeAllSessions/revokeAllInTx funcionan', async (t) => {
  const ctx = setup(t);
  const user = createUser(ctx, { email: 'helper@example.test', displayName: 'Luis Helper' });
  const helperSession = createSessionFor(ctx, user.id);

  const principal = ctx.container.accounts.resolveSession(helperSession.token, ctx.clock.now());
  assert.deepEqual(principal, {
    userId: user.id,
    sessionId: helperSession.sessionId,
    displayName: 'Luis Helper',
    sessionExpiresAt: START + 8 * HOUR,
  });

  const panel = await request(ctx.app).get('/panel').set('Cookie', helperSession.cookie);
  assert.equal(panel.status, 200);

  // Dos niveles de revocación masiva (preparado para B1.3):
  const events = [];
  ctx.container.sessionEvents.on('session-revoked', (e) => events.push(e));

  withTransaction(ctx.db, () => revokeAllInTx(ctx.db, user.id, 'PASSWORD_RESET', ctx.clock.now()));
  assert.equal(events.length, 0, 'revokeAllInTx no emite eventos dentro de la transacción');
  assert.equal(ctx.container.accounts.resolveSession(helperSession.token), null);

  const s2 = ctx.container.accounts.createSession(user.id);
  assert.ok(ctx.container.accounts.resolveSession(s2.token));
  ctx.container.accounts.revokeAllSessions(user.id, 'PASSWORD_RESET');
  assert.equal(ctx.container.accounts.resolveSession(s2.token), null);
  assert.deepEqual(events, [{ userId: user.id }]);
});
