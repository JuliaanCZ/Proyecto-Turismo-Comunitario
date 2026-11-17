import { randomBytes, randomUUID } from 'node:crypto';
import console from 'node:console';
import { createServer } from 'node:http';
import process from 'node:process';
import { URL } from 'node:url';
import { stringifySetCookie } from 'cookie';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createContainer } from '../src/container.js';
import { openDb } from '../src/shared/db.js';
import { sessionCookieName } from '../src/shared/http/auth.js';

// Vista autenticada SIMULADA (B1.9): levanta la aplicación real (`createApp`) con una sesión y un
// servicio de ofertas falsos, para ver el panel antes de que exista el ingreso real (B1.2) y el
// servicio de ofertas (B1.4/B1.5). Es una herramienta de desarrollo aparte:
//   - NO la importa `server.js` ni `src/**`, así que `npm start` y el despliegue no la incluyen;
//   - se niega a arrancar con APP_ENV=production;
//   - escucha solo en 127.0.0.1, con base en memoria y un token aleatorio nuevo en cada arranque;
//   - el token NUNCA se imprime: el propio servidor de simulación abre la sesión con
//     `GET /simulacion/sesion`, que responde 302 a /panel con `Set-Cookie`. Esa ruta existe solo aquí
//     (la atiende este servidor antes de entregar la petición a `createApp`; la aplicación no la tiene).
// Uso: node scripts/vista-panel-simulada.js [--ofertas=3] [--nombre="Ana Quispe"] [--sin-servicio] [--puerto=3100]
//   --sin-servicio  deja `offers` sin implementar (como en main hoy): el panel avisa y no muestra cifra.

if (process.env.APP_ENV === 'production') {
  console.error('Este script es solo de desarrollo: se niega a arrancar con APP_ENV=production.');
  process.exit(1);
}

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, '').split('=');
  return [key, rest.length ? rest.join('=') : true];
}));
const port = Number(args.puerto ?? 3100);
const total = Number(args.ofertas ?? 3);
const displayName = typeof args.nombre === 'string' ? args.nombre : 'Ana Quispe';
if (!Number.isInteger(port) || port < 1024 || port > 65535 || !Number.isInteger(total) || total < 0) {
  console.error('Uso: node scripts/vista-panel-simulada.js [--ofertas=3] [--nombre="Ana Quispe"] [--sin-servicio] [--puerto=3100]');
  process.exit(2);
}

const token = randomBytes(32).toString('base64url');
const principal = {
  userId: 1,
  sessionId: randomUUID(),
  displayName,
  sessionExpiresAt: Date.now() + 8 * 3_600_000,
};

const config = loadConfig({ APP_ENV: 'development', PORT: String(port), DATABASE_FILE: ':memory:' });
const overrides = {
  db: openDb(':memory:'),
  accounts: { resolveSession: (candidate) => (candidate === token ? principal : null) },
};
if (!args['sin-servicio']) overrides.offers = { listOffers: () => ({ total, items: [] }) };

const container = createContainer(config, overrides);
const app = createApp(container);

const SESSION_PATH = '/simulacion/sesion';
const allowedHosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`]);

// Abre la sesión ficticia: solo GET, solo con `Host` de loopback (evita que una página ajena, vía
// DNS rebinding, la use) y la cookie sale con las mismas opciones que usará el ingreso real (B1.2).
function openSimulatedSession(req, res) {
  if (req.method !== 'GET' || !allowedHosts.has(req.headers.host ?? '')) {
    res.writeHead(403, { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Solo se abre desde http://localhost con GET.');
    return;
  }
  res.writeHead(302, {
    'Cache-Control': 'no-store',
    Location: '/panel',
    'Set-Cookie': stringifySetCookie({
      name: sessionCookieName(config),
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 3600,
    }),
  });
  res.end();
}

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://simulacion.local');
  if (pathname === SESSION_PATH) return openSimulatedSession(req, res);
  return app(req, res);
});
server.listen(port, '127.0.0.1', () => {
  console.log('VISTA SIMULADA: la sesión y el servicio de ofertas son falsos; las cifras no vienen de ninguna base.');
  console.log(`Portada:  http://localhost:${port}/`);
  console.log(`Panel:    http://localhost:${port}/panel`);
  console.log(args['sin-servicio']
    ? 'Ofertas:  servicio sin implementar (el panel muestra el aviso, sin cifra).'
    : `Ofertas:  simuladas, total = ${total}.`);
  console.log(`Sesión:   http://localhost:${port}${SESSION_PATH}  (el servidor fija la cookie y te lleva al panel; no se imprime ningún token)`);
});

function close() {
  server.close(() => container.close());
}
process.once('SIGINT', close);
process.once('SIGTERM', close);
