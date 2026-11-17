import { randomBytes, randomUUID } from 'node:crypto';
import console from 'node:console';
import process from 'node:process';
import { URL } from 'node:url';
import { stringifySetCookie } from 'cookie';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createContainer } from '../src/container.js';
import { createHttpServer } from '../src/server.js';
import { openDb } from '../src/shared/db.js';
import { sessionCookieName } from '../src/shared/http/auth.js';

// Demostración SIMULADA del aviso de nuevo mensaje (B1.10) en dos navegadores, mientras no exista el
// ingreso real (B1.2). Levanta la aplicación real —Express, el gateway Socket.IO, el chat de B1.7 y
// `registerNotifications`— con una base en memoria y las SESIONES falsas de dos usuarios (ana y luis).
// Es una herramienta de desarrollo aparte:
//   - NO la importa `server.js` ni `src/**`, así que `npm start` y el despliegue no la incluyen;
//   - se niega a arrancar con APP_ENV=production;
//   - escucha solo en 127.0.0.1 y genera un token aleatorio por usuario en cada arranque;
//   - los tokens y las cookies NUNCA se imprimen: el propio servidor de simulación abre cada sesión con
//     `GET /simulacion/sesion?usuario=ana|luis`, que responde 302 a /panel con `Set-Cookie` (HTTP).
//     Esa ruta existe solo aquí (la atiende antes de entregar la petición a `createApp`).
// Uso: node scripts/demo-aviso-chat.js [--puerto=3100]
// Dos navegadores (o un perfil normal y una ventana privada): uno entra como ana, el otro como luis.

if (process.env.APP_ENV === 'production') {
  console.error('Este script es solo de desarrollo: se niega a arrancar con APP_ENV=production.');
  process.exit(1);
}

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, '').split('=');
  return [key, rest.length ? rest.join('=') : true];
}));
const port = Number(args.puerto ?? 3100);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error('Uso: node scripts/demo-aviso-chat.js [--puerto=3100]');
  process.exit(2);
}

const config = loadConfig({ APP_ENV: 'development', PORT: String(port), DATABASE_FILE: ':memory:' });
const db = openDb(':memory:');
const sessions = new Map();
const accounts = new Map();

const container = createContainer(config, {
  db,
  accounts: { resolveSession: (candidate) => sessions.get(candidate) ?? null },
});

for (const [slug, displayName] of [['ana', 'Ana Quispe'], ['luis', 'Luis Andrade']]) {
  const created = db.prepare(
    'INSERT INTO users (email, display_name, password_hash, created_at) VALUES (?, ?, ?, ?)',
  ).run(`${slug}@demo.local`, displayName, 'sin-ingreso-real-solo-demo', Date.now());
  const token = randomBytes(32).toString('base64url');
  sessions.set(token, {
    userId: Number(created.lastInsertRowid),
    sessionId: randomUUID(),
    displayName,
    sessionExpiresAt: Date.now() + 8 * 3_600_000,
  });
  accounts.set(slug, token);
}

const app = createApp(container);
const SESSION_PATH = '/simulacion/sesion';
const allowedHosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`]);

// Abre la sesión ficticia: solo GET, solo con `Host` de loopback (evita DNS rebinding) y con la misma
// cookie que fijará el ingreso real (B1.2).
function openSimulatedSession(req, res, url) {
  const token = accounts.get(url.searchParams.get('usuario') ?? '');
  const text = (status, body) => {
    res.writeHead(status, { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(body);
  };
  if (req.method !== 'GET' || !allowedHosts.has(req.headers.host ?? '')) {
    text(403, 'Solo se abre desde http://localhost con GET.');
    return;
  }
  if (!token) {
    text(404, 'Usuario simulado desconocido: usa ?usuario=ana o ?usuario=luis.');
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

const { httpServer, io } = createHttpServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://simulacion.local');
  if (url.pathname === SESSION_PATH) return openSimulatedSession(req, res, url);
  return app(req, res);
}, container);

httpServer.listen(port, '127.0.0.1', () => {
  console.log('DEMO SIMULADA: las sesiones de ana y luis son falsas; el chat y el aviso son los reales.');
  console.log(`Ana:   http://localhost:${port}${SESSION_PATH}?usuario=ana   (abre la sesión y va a /panel)`);
  console.log(`Luis:  http://localhost:${port}${SESSION_PATH}?usuario=luis  (en OTRO navegador o ventana privada)`);
  console.log('Ninguna dirección ni mensaje de este script contiene un token o una cookie.');
});

function close() {
  io.close(() => container.close());
}
process.once('SIGINT', close);
process.once('SIGTERM', close);
