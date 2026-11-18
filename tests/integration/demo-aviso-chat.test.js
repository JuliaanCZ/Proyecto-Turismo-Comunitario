import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { request } from 'node:http';
import { createServer } from 'node:net';
import process from 'node:process';
import test from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath, URL } from 'node:url';
import supertest from 'supertest';
import { createTestContext } from '../helpers/context.js';
import { connect } from '../helpers/ws.js';

// Herramienta local de B1.10 (`scripts/demo-aviso-chat.js`): dos sesiones simuladas que se abren con una
// respuesta HTTP del propio servidor de simulación, sin imprimir tokens ni cookies, aislada de producción.

const { fetch } = globalThis; // cliente HTTP de Node (no se importa de ningún módulo)

const SCRIPT = fileURLToPath(new URL('../../scripts/demo-aviso-chat.js', import.meta.url));

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function start(t) {
  const port = await freePort();
  const child = spawn(process.execPath, [SCRIPT, `--puerto=${port}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  t.after(() => child.kill());
  const deadline = Date.now() + 15_000;
  while (!output.includes('Ninguna dirección')) {
    assert.ok(Date.now() < deadline && child.exitCode === null, `la demostración no arrancó:\n${output}`);
    await sleep(50);
  }
  return { port, base: `http://localhost:${port}`, output: () => output };
}

async function openSession(base, user) {
  const response = await fetch(`${base}/simulacion/sesion?usuario=${user}`, { redirect: 'manual' });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/panel');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const setCookie = response.headers.get('set-cookie');
  assert.match(setCookie, /^tc_session=[\w-]{20,};/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  return { setCookie, cookie: setCookie.split(';')[0] };
}

test('demo del aviso: se niega a arrancar con APP_ENV=production', () => {
  const res = spawnSync(process.execPath, [SCRIPT, '--puerto=3198'], {
    env: { ...process.env, APP_ENV: 'production' },
    encoding: 'utf8',
  });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /APP_ENV=production/);
});

test('demo del aviso: cada usuario recibe su cookie por HTTP y ningún token se imprime', async (t) => {
  const { base, output } = await start(t);

  const anonimo = await fetch(`${base}/panel`, { redirect: 'manual' });
  assert.equal(anonimo.status, 302);
  assert.equal(anonimo.headers.get('location'), '/ingreso?next=%2Fpanel');

  const ana = await openSession(base, 'ana');
  const luis = await openSession(base, 'luis');
  assert.notEqual(ana.cookie, luis.cookie);
  for (const { cookie } of [ana, luis]) {
    const token = cookie.split('=')[1];
    assert.equal(output().includes(token), false, 'el token no debe aparecer en la salida');
    const panel = await fetch(`${base}/panel`, { headers: { Cookie: cookie }, redirect: 'manual' });
    assert.equal(panel.status, 200);
    assert.equal(panel.headers.get('cache-control'), 'no-store');
    assert.equal((await panel.text()).includes(token), false);
  }
  assert.equal(output().includes('tc_session'), false, 'la cookie no debe aparecer en la salida');
});

test('demo del aviso: la ruta rechaza otro Host, otro método y usuarios desconocidos', async (t) => {
  const { base, port } = await start(t);

  const hostAjeno = await new Promise((resolve, reject) => {
    const req = request({
      host: '127.0.0.1',
      port,
      path: '/simulacion/sesion?usuario=ana',
      headers: { host: 'atacante.example' },
    }, (res) => {
      res.resume();
      resolve({ status: res.statusCode, cookie: res.headers['set-cookie'] });
    });
    req.once('error', reject);
    req.end();
  });
  assert.equal(hostAjeno.status, 403);
  assert.equal(hostAjeno.cookie, undefined);

  const post = await fetch(`${base}/simulacion/sesion?usuario=ana`, { method: 'POST', redirect: 'manual' });
  assert.equal(post.status, 403);
  assert.equal(post.headers.get('set-cookie'), null);
  const desconocido = await fetch(`${base}/simulacion/sesion?usuario=otra`, { redirect: 'manual' });
  assert.equal(desconocido.status, 404);
  assert.equal(desconocido.headers.get('set-cookie'), null);

  // La aplicación real no tiene esa ruta: solo la atiende la herramienta.
  const ctx = createTestContext();
  t.after(() => ctx.close());
  const real = await supertest(ctx.app).get('/simulacion/sesion?usuario=ana');
  assert.equal(real.status, 404);
  assert.equal(real.headers['set-cookie'], undefined);
});

test('demo del aviso: con las cookies HTTP de la demo, el chat real de ana avisa a luis', async (t) => {
  const { base } = await start(t);
  const ana = await openSession(base, 'ana');
  const luis = await openSession(base, 'luis');

  const anaSocket = connect({ url: base, cookie: ana.cookie, origin: base });
  const luisSocket = connect({ url: base, cookie: luis.cookie, origin: base });
  t.after(() => { anaSocket.disconnect(); luisSocket.disconnect(); });
  await Promise.all([anaSocket.waitForConnection(), luisSocket.waitForConnection()]);
  assert.equal((await anaSocket.timeout(1_000).emitWithAck('chat:join')).ok, true);

  const response = await anaSocket.timeout(1_000).emitWithAck('chat:send', { clientMessageId: randomUUID(), text: 'Hola Luis' });
  assert.equal(response.ok, true);
  await luisSocket.waitFor('notification:new-message');
  const notice = luisSocket.received.find((item) => item.event === 'notification:new-message').data;
  assert.deepEqual(notice, {
    messageId: response.message.id,
    authorDisplayName: 'Ana Quispe',
    createdAt: response.message.createdAt,
  });
});
