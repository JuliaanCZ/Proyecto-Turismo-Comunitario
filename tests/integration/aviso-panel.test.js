import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createSessionFor, fakeAccounts } from '../helpers/auth.js';
import { createTestContext } from '../helpers/context.js';
import { createUser } from '../helpers/factories.js';

// B1.10 — carga de `notificaciones.js` en las pantallas autenticadas fuera del chat, sin tocar la CSP
// ni las políticas no-store. El comportamiento del navegador (insignia sin recargar) se comprueba en
// Chrome y queda en docs/mvp/evidencias/B1.10/.

const NOTIFICATIONS = '<script type="module" src="/js/notificaciones.js"';
const SOCKET_CLIENT = '<script src="/socket.io/socket.io.js"></script>';
const BADGE = 'id="chat-badge"';

function setup(t) {
  const sessions = new Map();
  const ctx = createTestContext({
    overrides: { accounts: fakeAccounts(sessions), logger: { error() {} } },
  });
  t.after(() => ctx.close());
  const user = createUser(ctx, { email: 'ana@test.local', displayName: 'Ana Quispe' });
  const { token, sessionId, cookie } = createSessionFor(ctx, user.id);
  sessions.set(token, {
    userId: user.id,
    sessionId,
    displayName: 'Ana Quispe',
    sessionExpiresAt: ctx.clock.now() + 8 * 3_600_000,
  });
  return { app: ctx.app, cookie, token, sessionId, userId: user.id };
}

test('aviso: /panel, la portada y un 404 con sesión cargan el aviso', async (t) => {
  const { app, cookie } = setup(t);
  for (const path of ['/panel', '/', '/panel/no-existe']) {
    const res = await request(app).get(path).set('Cookie', cookie);
    assert.match(res.text, new RegExp(BADGE), path);
    assert.ok(res.text.includes(SOCKET_CLIENT), `${path}: falta el cliente Socket.IO`);
    assert.ok(res.text.includes(NOTIFICATIONS), `${path}: falta notificaciones.js`);
    assert.equal(res.headers['cache-control'], 'no-store', path);
  }
});

test('aviso: /panel/chat (también con barra final o mayúsculas) no carga el aviso y sigue cargando el chat', async (t) => {
  const { app, cookie } = setup(t);
  for (const path of ['/panel/chat', '/panel/chat/', '/PANEL/CHAT']) {
    const res = await request(app).get(path).set('Cookie', cookie);
    assert.equal(res.status, 200, path);
    assert.equal(res.text.includes('/js/notificaciones.js'), false, `${path}: no debe cargar el aviso`);
    assert.equal(res.text.split('/socket.io/socket.io.js').length - 1, 1, `${path}: un solo cliente Socket.IO`);
    assert.ok(res.text.includes('/js/chat.js'), `${path}: falta chat.js`);
  }
});

test('aviso: sin sesión no se carga ningún script de tiempo real', async (t) => {
  const { app } = setup(t);
  for (const path of ['/', '/ingreso', '/registro']) {
    const res = await request(app).get(path);
    assert.equal(res.text.includes('notificaciones.js'), false, path);
    assert.equal(res.text.includes('socket.io'), false, path);
  }
});

test('aviso: la CSP no se relaja (scripts propios, conexión al mismo origen) y la insignia sigue vacía y oculta', async (t) => {
  const { app, cookie } = setup(t);
  const res = await request(app).get('/panel').set('Cookie', cookie);
  const csp = res.headers['content-security-policy'];
  assert.match(csp, /script-src 'self'(;|$)/);
  assert.match(csp, /connect-src 'self' ws:\/\/localhost:3000(;|$)/);
  assert.equal(csp.includes('unsafe'), false);
  assert.match(res.text, /<span id="chat-badge" class="insignia" hidden><\/span>/);
  assert.equal(res.text.includes('aria-live'), false, 'sin JavaScript no hay región viva ni insignia');
});

test('aviso: el script lleva el id numérico del usuario y no expone token ni id de sesión (contador por cuenta)', async (t) => {
  const { app, cookie, token, sessionId, userId } = setup(t);
  const res = await request(app).get('/panel').set('Cookie', cookie);
  assert.ok(
    res.text.includes(`${NOTIFICATIONS} data-user-id="${userId}"></script>`),
    'falta data-user-id en el script del aviso',
  );
  assert.match(String(userId), /^\d+$/);
  assert.equal(res.text.includes(token), false, 'la página no debe contener el token de sesión');
  assert.equal(res.text.includes(sessionId), false, 'la página no debe contener el id de sesión');
  // chat.js sigue borrando la clave de siempre (compatibilidad del contador).
  const chat = await request(app).get('/js/chat.js');
  assert.match(chat.text, /sessionStorage\.removeItem\('chatNuevos'\)/);
  // El módulo del contador se sirve con el mismo origen (CSP script-src 'self').
  const module = await request(app).get('/js/notificaciones-contador.js');
  assert.equal(module.status, 200);
});
