import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createContainer } from '../../src/container.js';
import { fixedClock } from '../../src/shared/clock.js';
import { openDb } from '../../src/shared/db.js';

const ORIGIN = 'http://localhost:3000';
const PASSWORD = 'Clave-segura-99';
const NEW_PASSWORD = 'Nueva-clave-segura-1';
const START = Date.UTC(2026, 10, 17, 15, 0, 0);
const MINUTE = 60_000;
const TOKEN_INVALID_TEXT = 'El enlace no es válido o ya venció. Solicita uno nuevo.';

function setup(t, env = {}) {
  const db = openDb(':memory:');
  const clock = fixedClock(START);
  const config = loadConfig({
    APP_ENV: 'test',
    DATABASE_FILE: ':memory:',
    ARGON2_MEMORY_KIB: '8',
    ARGON2_TIME_COST: '1',
    DEMO_MAILBOX_ENABLED: 'true',
    DEMO_MAILBOX_PASSWORD: 'clave-bandeja-prueba',
    ...env,
  });
  const container = createContainer(config, { db, clock });
  t.after(() => container.close());
  return { db, container, clock, config, app: createApp(container), origin: config.appOrigin };
}

async function registerAna({ container }) {
  return container.accounts.registerUser({
    displayName: 'Ana Quispe',
    email: 'ana@example.test',
    password: PASSWORD,
    passwordConfirm: PASSWORD,
  });
}

function pedirEnlace(ctx, email) {
  return request(ctx.app).post('/recuperar').set('Origin', ctx.origin).type('form').send({ email });
}

function ultimoToken(ctx) {
  const row = ctx.db.prepare('SELECT body FROM mail_outbox ORDER BY id DESC LIMIT 1').get();
  return /\/restablecer\?token=([A-Za-z0-9_-]+)/.exec(row.body)[1];
}

function restablecer(ctx, token, password = NEW_PASSWORD, confirm = password) {
  return request(ctx.app).post('/restablecer').set('Origin', ctx.origin).type('form')
    .send({ token, newPassword: password, newPasswordConfirm: confirm });
}

async function claveVigente(ctx, password) {
  try {
    await ctx.container.accounts.authenticate('ana@example.test', password);
    return true;
  } catch {
    return false;
  }
}

test('TM-CTA-13: correo existente e inexistente reciben el mismo estado y el mismo cuerpo', async (t) => {
  const ctx = setup(t);
  await registerAna(ctx);

  const existe = await pedirEnlace(ctx, 'ana@example.test');
  const noExiste = await pedirEnlace(ctx, 'nadie@example.test');
  assert.equal(existe.status, 302);
  assert.equal(noExiste.status, existe.status);
  assert.equal(noExiste.headers.location, existe.headers.location);
  assert.equal(noExiste.text, existe.text);
  assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM mail_outbox').get().n, 1);

  assert.deepEqual(await ctx.container.accounts.requestPasswordReset('ana@example.test'), { accepted: true });
  assert.deepEqual(await ctx.container.accounts.requestPasswordReset('nadie@example.test'), { accepted: true });

  const aviso = await request(ctx.app).get(existe.headers.location);
  assert.equal(aviso.status, 200);
  assert.match(aviso.text, /Si el correo tiene una cuenta/);

  const malFormato = await pedirEnlace(ctx, 'no-es-correo');
  assert.equal(malFormato.status, 422);
  assert.match(malFormato.text, /role="alert"/);
});

test('TM-CTA-14: el token se guarda solo como hash, el enlace usa APP_ORIGIN y abrirlo no lo consume', async (t) => {
  const ctx = setup(t, { APP_ORIGIN: 'https://turismo.example' });
  await registerAna(ctx);

  const res = await pedirEnlace(ctx, 'ana@example.test').set('Host', 'evil.test');
  assert.equal(res.status, 302);

  const mail = ctx.db.prepare('SELECT to_email, subject, body FROM mail_outbox').get();
  assert.equal(mail.to_email, 'ana@example.test');
  assert.match(mail.body, /https:\/\/turismo\.example\/restablecer\?token=/);
  assert.doesNotMatch(mail.body, /evil\.test/);

  const token = ultimoToken(ctx);
  assert.equal(Buffer.from(token, 'base64url').length, 32);
  const row = ctx.db.prepare('SELECT token_hash, expires_at, used_at FROM password_reset_tokens').get();
  assert.equal(row.token_hash, createHash('sha256').update(token).digest('hex'));
  assert.equal(row.expires_at, START + 30 * MINUTE);
  assert.equal(row.used_at, null);

  const form = await request(ctx.app).get(`/restablecer?token=${token}`);
  assert.equal(form.status, 200);
  assert.equal(form.headers['referrer-policy'], 'no-referrer');
  assert.match(form.text, new RegExp(`name="token" value="${token}"`));
  assert.equal(ctx.db.prepare('SELECT used_at FROM password_reset_tokens').get().used_at, null);
});

test('TM-CTA-15: un token válido cambia la clave una sola vez; el segundo uso da TOKEN_INVALID', async (t) => {
  const ctx = setup(t);
  await registerAna(ctx);
  await pedirEnlace(ctx, 'ana@example.test');
  const token = ultimoToken(ctx);

  const debil = await restablecer(ctx, token, 'ana@example.test');
  assert.equal(debil.status, 422, 'la política de B1.1 aplica también aquí');
  assert.equal(ctx.db.prepare('SELECT used_at FROM password_reset_tokens').get().used_at, null);

  const ok = await restablecer(ctx, token);
  assert.equal(ok.status, 302);
  assert.equal(ok.headers.location, '/ingreso?aviso=clave-cambiada');
  assert.equal(await claveVigente(ctx, NEW_PASSWORD), true);
  assert.equal(await claveVigente(ctx, PASSWORD), false);

  const segundo = await restablecer(ctx, token, 'Otra-clave-segura-22');
  assert.equal(segundo.status, 400);
  assert.match(segundo.text, new RegExp(TOKEN_INVALID_TEXT));
  assert.equal(await claveVigente(ctx, NEW_PASSWORD), true);

  await assert.rejects(
    () => ctx.container.accounts.resetPassword({ token, newPassword: NEW_PASSWORD, newPasswordConfirm: NEW_PASSWORD }),
    (error) => error.code === 'TOKEN_INVALID' && error.message === TOKEN_INVALID_TEXT,
  );
});

test('TM-CTA-16: un token vencido (reloj +31 min) da el mismo TOKEN_INVALID', async (t) => {
  const ctx = setup(t);
  await registerAna(ctx);
  await pedirEnlace(ctx, 'ana@example.test');
  const token = ultimoToken(ctx);

  ctx.clock.advance(31 * MINUTE);
  const res = await restablecer(ctx, token);
  assert.equal(res.status, 400);
  assert.match(res.text, new RegExp(TOKEN_INVALID_TEXT));
  assert.equal(await claveVigente(ctx, PASSWORD), true);
});

test('TM-CTA-17: dos solicitudes seguidas dejan un solo token utilizable (el último)', async (t) => {
  const ctx = setup(t);
  await registerAna(ctx);
  await pedirEnlace(ctx, 'ana@example.test');
  const primero = ultimoToken(ctx);
  ctx.clock.advance(MINUTE);
  await pedirEnlace(ctx, 'ana@example.test');
  const segundo = ultimoToken(ctx);

  assert.notEqual(primero, segundo);
  assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM password_reset_tokens').get().n, 1);
  assert.equal((await restablecer(ctx, primero)).status, 400);
  assert.equal((await restablecer(ctx, segundo)).status, 302);
});

test('TM-CTA-18: tras restablecer, la sesión anterior ya no abre /panel y sale session-revoked con userId', async (t) => {
  const ctx = setup(t);
  const { userId } = await registerAna(ctx);
  const login = await request(ctx.app).post('/ingreso').set('Origin', ctx.origin).type('form')
    .send({ email: 'ana@example.test', password: PASSWORD });
  const cookie = login.headers['set-cookie'][0].split(';')[0];
  assert.equal((await request(ctx.app).get('/panel').set('Cookie', cookie)).status, 200);

  const events = [];
  ctx.container.sessionEvents.on('session-revoked', (event) => {
    // Se emite después del COMMIT: la clave y la revocación ya son visibles.
    const abiertas = ctx.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE revoked_at IS NULL').get().n;
    events.push({ event, abiertas });
  });

  await pedirEnlace(ctx, 'ana@example.test');
  assert.equal((await restablecer(ctx, ultimoToken(ctx))).status, 302);

  assert.deepEqual(events, [{ event: { userId }, abiertas: 0 }]);
  const revocada = ctx.db.prepare('SELECT revoke_reason FROM sessions').get();
  assert.equal(revocada.revoke_reason, 'PASSWORD_RESET');
  const panel = await request(ctx.app).get('/panel').set('Cookie', cookie);
  assert.equal(panel.status, 302);
  assert.equal(panel.headers.location, '/ingreso?next=%2Fpanel');
});

test('con Referrer-Policy no-referrer el navegador envía Origin: null; solo /restablecer lo acepta', async (t) => {
  const ctx = setup(t);
  await registerAna(ctx);
  await pedirEnlace(ctx, 'ana@example.test');

  const res = await request(ctx.app).post('/restablecer').set('Origin', 'null').type('form')
    .send({ token: ultimoToken(ctx), newPassword: NEW_PASSWORD, newPasswordConfirm: NEW_PASSWORD });
  assert.equal(res.status, 302);
  assert.equal(await claveVigente(ctx, NEW_PASSWORD), true);

  for (const ruta of ['/ingreso', '/recuperar', '/registro']) {
    const otro = await request(ctx.app).post(ruta).set('Origin', 'null').type('form').send({ email: 'ana@example.test' });
    assert.equal(otro.status, 403, ruta);
  }
  const sinOrigen = await request(ctx.app).post('/restablecer').type('form').send({ token: 'x' });
  assert.equal(sinOrigen.status, 403, 'sin cabecera Origin sigue rechazado');
});

test('TM-CTA-19: /dev/bandeja responde 404 desactivada, 401 sin la clave y lista el enlace con la clave', async (t) => {
  const apagada = setup(t, { DEMO_MAILBOX_ENABLED: 'false' });
  assert.equal((await request(apagada.app).get('/dev/bandeja')).status, 404);

  const ctx = setup(t);
  await registerAna(ctx);
  await pedirEnlace(ctx, 'ana@example.test');

  const sinClave = await request(ctx.app).get('/dev/bandeja');
  assert.equal(sinClave.status, 401);
  assert.match(sinClave.headers['www-authenticate'], /^Basic /);
  assert.equal((await request(ctx.app).get('/dev/bandeja').auth('demo', 'clave-incorrecta')).status, 401);

  const conClave = await request(ctx.app).get('/dev/bandeja').auth('demo', 'clave-bandeja-prueba');
  assert.equal(conClave.status, 200);
  assert.match(conClave.headers['cache-control'], /no-store/);
  assert.match(conClave.text, /ana@example\.test/);
  assert.match(conClave.text, new RegExp(`href="${ORIGIN}/restablecer\\?token=${ultimoToken(ctx)}"`));
});
