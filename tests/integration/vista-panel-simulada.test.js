import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { request } from 'node:http';
import { createServer } from 'node:net';
import process from 'node:process';
import test from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath, URL } from 'node:url';
import supertest from 'supertest';
import { createTestContext } from '../helpers/context.js';

// Herramienta local de B1.9 (`scripts/vista-panel-simulada.js`): la sesión ficticia se abre con una
// respuesta HTTP del propio servidor de simulación y el token no se imprime en ningún sitio.

const { fetch } = globalThis; // cliente HTTP de Node (no se importa de ningún módulo)

const SCRIPT = fileURLToPath(new URL('../../scripts/vista-panel-simulada.js', import.meta.url));

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

async function start(t, extraArgs = []) {
  const port = await freePort();
  const child = spawn(process.execPath, [SCRIPT, `--puerto=${port}`, ...extraArgs], { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  t.after(() => child.kill());
  const deadline = Date.now() + 15_000;
  while (!output.includes('Sesión:')) {
    assert.ok(Date.now() < deadline && child.exitCode === null, `la vista simulada no arrancó:\n${output}`);
    await sleep(50);
  }
  return { port, base: `http://localhost:${port}`, output: () => output };
}

test('vista simulada: se niega a arrancar con APP_ENV=production', () => {
  const res = spawnSync(process.execPath, [SCRIPT, '--puerto=3199'], {
    env: { ...process.env, APP_ENV: 'production' },
    encoding: 'utf8',
  });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /APP_ENV=production/);
});

test('vista simulada: /simulacion/sesion fija la cookie por HTTP, sin imprimir el token', async (t) => {
  const { base, port, output } = await start(t);

  // Sin la sesión simulada, /panel redirige al ingreso.
  const anonimo = await fetch(`${base}/panel`, { redirect: 'manual' });
  assert.equal(anonimo.status, 302);
  assert.equal(anonimo.headers.get('location'), '/ingreso?next=%2Fpanel');

  const abrir = await fetch(`${base}/simulacion/sesion`, { redirect: 'manual' });
  assert.equal(abrir.status, 302);
  assert.equal(abrir.headers.get('location'), '/panel');
  assert.equal(abrir.headers.get('cache-control'), 'no-store');
  const setCookie = abrir.headers.get('set-cookie');
  assert.match(setCookie, /^tc_session=[\w-]{20,};/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  assert.match(setCookie, /Path=\//);

  const pair = setCookie.split(';')[0];
  const token = pair.slice(pair.indexOf('=') + 1);
  const panel = await fetch(`${base}/panel`, { headers: { cookie: pair } });
  assert.equal(panel.status, 200);
  assert.match(await panel.text(), /Hola, Ana Quispe/);

  // El token no aparece en la salida del proceso (ni en la cookie impresa ni suelto).
  assert.ok(!output().includes(token), 'la salida no debe contener el token');
  assert.doesNotMatch(output(), /tc_session/);
  assert.match(output(), new RegExp(`http://localhost:${port}/simulacion/sesion`));

  // Solo GET y solo con Host de loopback.
  const post = await fetch(`${base}/simulacion/sesion`, { method: 'POST', redirect: 'manual' });
  assert.equal(post.status, 403);
  assert.equal(post.headers.get('set-cookie'), null);
});

test('vista simulada: la ruta de sesión no existe en la aplicación real y rechaza otro Host', async (t) => {
  const { port } = await start(t);
  const rechazo = await new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path: '/simulacion/sesion', headers: { host: 'atacante.example' } }, (res) => {
      res.resume();
      resolve({ status: res.statusCode, cookie: res.headers['set-cookie'] });
    });
    req.once('error', reject);
    req.end();
  });
  assert.equal(rechazo.status, 403);
  assert.equal(rechazo.cookie, undefined);

  const ctx = createTestContext();
  t.after(() => ctx.close());
  const res = await supertest(ctx.app).get('/simulacion/sesion');
  assert.equal(res.status, 404);
  assert.equal(res.headers['set-cookie'], undefined);
});
