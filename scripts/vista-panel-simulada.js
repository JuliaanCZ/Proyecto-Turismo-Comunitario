import { randomBytes, randomUUID } from 'node:crypto';
import console from 'node:console';
import { createServer } from 'node:http';
import process from 'node:process';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createContainer } from '../src/container.js';
import { openDb } from '../src/shared/db.js';

// Vista autenticada SIMULADA (B1.9): levanta la aplicación real (`createApp`) con una sesión y un
// servicio de ofertas falsos, para ver el panel antes de que exista el ingreso real (B1.2) y el
// servicio de ofertas (B1.4/B1.5). Es una herramienta de desarrollo aparte:
//   - NO la importa `server.js` ni `src/**`, así que `npm start` y el despliegue no la incluyen;
//   - se niega a arrancar con APP_ENV=production;
//   - escucha solo en 127.0.0.1, con base en memoria y un token aleatorio nuevo en cada arranque.
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
const server = createServer(createApp(container));
server.listen(port, '127.0.0.1', () => {
  console.log('VISTA SIMULADA: la sesión y el servicio de ofertas son falsos; las cifras no vienen de ninguna base.');
  console.log(`Portada:  http://localhost:${port}/`);
  console.log(`Panel:    http://localhost:${port}/panel`);
  console.log(args['sin-servicio']
    ? 'Ofertas:  servicio sin implementar (el panel muestra el aviso, sin cifra).'
    : `Ofertas:  simuladas, total = ${total}.`);
  console.log(`Cookie:   tc_session=${token}`);
  console.log('Para ver el panel, crea esa cookie en las herramientas del navegador (Application > Cookies) y recarga.');
});

function close() {
  server.close(() => container.close());
}
process.once('SIGINT', close);
process.once('SIGTERM', close);
