import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { io as connect } from 'socket.io-client';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createContainer } from '../../src/container.js';
import { createHttpServer } from '../../src/server.js';
import { openDb } from '../../src/shared/db.js';

async function listen(t) {
  // La app real (B0.4) con la base en memoria; HTTP y Socket.IO comparten puerto como en B0.1.
  const container = createContainer(loadConfig({}), { db: openDb(':memory:'), logger: { error() {} } });
  const { httpServer, io } = createHttpServer(createApp(container));
  t.after(() => new Promise((resolve) => io.close(() => {
    container.close();
    resolve();
  })));
  const listening = once(httpServer, 'listening');
  httpServer.listen(0, '127.0.0.1');
  await listening;
  return { httpServer, url: `http://127.0.0.1:${httpServer.address().port}` };
}

test('TM-BASE-01: GET /salud devuelve 200 y el estado esperado', async (t) => {
  const { httpServer } = await listen(t);
  await request(httpServer).get('/salud').expect(200, { status: 'ok' });
});

test('TM-BASE-02: Express y el transporte WebSocket responden en el mismo puerto', async (t) => {
  const { httpServer, url } = await listen(t);
  const socket = connect(url, {
    transports: ['websocket'],
    reconnection: false,
    timeout: 3000,
  });

  try {
    await new Promise((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
    assert.equal(socket.io.engine.transport.name, 'websocket');
    await request(httpServer).get('/salud').expect(200, { status: 'ok' });
  } finally {
    socket.disconnect();
  }
});

test('C-ENV: conserva los valores de desarrollo y valida el número opcional', () => {
  assert.equal(loadConfig({}).databaseFile, './data/app.sqlite');
  assert.equal(loadConfig({}).whatsappBookingNumber, null);
  const config = loadConfig({ PORT: '3001', WHATSAPP_BOOKING_NUMBER: '593990000000' });
  assert.equal(config.appOrigin, 'http://localhost:3001');
  assert.equal(config.whatsappBookingNumber, '593990000000');
  assert.throws(() => loadConfig({ WHATSAPP_BOOKING_NUMBER: '+593990000000' }), /WHATSAPP_BOOKING_NUMBER/);
});

test('C-ENV: producción exige HTTPS, cookies seguras y un secreto propio', () => {
  const env = { APP_ENV: 'production', APP_ORIGIN: 'https://turismo.example' };
  assert.throws(() => loadConfig({ ...env, APP_ORIGIN: 'http://turismo.example' }), /APP_ORIGIN/);
  assert.throws(() => loadConfig({ ...env, COOKIE_SECURE: 'false' }), /COOKIE_SECURE/);
  assert.throws(() => loadConfig(env), /CSRF_SECRET/);
  assert.throws(
    () => loadConfig({ ...env, CSRF_SECRET: 'valor-privado' }),
    (error) => /CSRF_SECRET/.test(error.message) && !error.message.includes('valor-privado'),
  );
  const config = loadConfig({ ...env, CSRF_SECRET: 'x'.repeat(32) });
  assert.equal(config.cookieSecure, true);
  assert.equal(config.demoMailboxEnabled, false);
});
