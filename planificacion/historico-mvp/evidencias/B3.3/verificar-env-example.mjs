// B3.3: contrasta `.env.example` con `src/config.js`. No lee ni imprime tu `.env`.
// Uso, desde la raíz del repositorio: node docs/mvp/evidencias/B3.3/verificar-env-example.mjs
// Sale con 0 si todo coincide y con 1 si algo no coincide.
import { readFileSync } from 'node:fs';
import console from 'node:console';
import process from 'node:process';
import { loadConfig } from '../../../../src/config.js';

const config = readFileSync('src/config.js', 'utf8');
const example = readFileSync('.env.example', 'utf8');

// Claves que lee src/config.js: `env.NOMBRE` y `integer|boolean|secret(env, 'NOMBRE'`.
const used = new Set([
  ...[...config.matchAll(/\benv\.([A-Z][A-Z0-9_]+)/g)].map((m) => m[1]),
  ...[...config.matchAll(/\b(?:integer|boolean|secret)\(env,\s*'([A-Z][A-Z0-9_]+)'/g)].map((m) => m[1]),
]);

const entries = new Map();
for (const raw of example.split(/\r?\n/)) {
  const m = raw.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (m) entries.set(m[1], m[2]);
}

let failures = 0;
function check(ok, message) {
  console.log(`${ok ? 'OK ' : 'FALLA'} ${message}`);
  if (!ok) failures += 1;
}

console.log(`Claves que lee src/config.js (${used.size}): ${[...used].sort().join(', ')}`);
console.log(`Claves de .env.example (${entries.size}): ${[...entries.keys()].sort().join(', ')}`);
for (const key of [...used].sort()) check(entries.has(key), `${key} está en .env.example`);
for (const key of [...entries.keys()].sort()) check(used.has(key), `${key} de .env.example lo lee src/config.js`);

// Solo marcadores: los secretos son textos ficticios reconocibles y el número de WhatsApp va vacío.
const secretKeys = ['CSRF_SECRET', 'DEMO_MAILBOX_PASSWORD', 'SEED_DEMO_PASSWORD'];
for (const key of secretKeys) check(/ejemplo/i.test(entries.get(key) ?? ''), `${key} es un marcador ficticio («ejemplo…»)`);
check((entries.get('WHATSAPP_BOOKING_NUMBER') ?? 'x') === '', 'WHATSAPP_BOOKING_NUMBER está vacío (el número es opcional y debe ser autorizado)');
check(!/-----BEGIN|AKIA[0-9A-Z]{16}|ghp_|sk-[A-Za-z0-9]{20}/.test(example), '.env.example no contiene patrones de claves privadas ni tokens');

// El archivo debe cargarse tal cual con la validación real de la aplicación (desarrollo).
let loaded;
try {
  loaded = loadConfig(Object.fromEntries(entries));
} catch (error) {
  check(false, `loadConfig(.env.example) falló: ${error.message}`);
}
if (loaded) {
  check(loaded.appEnv === 'development', `loadConfig acepta .env.example sin cambios (APP_ENV=${loaded.appEnv}, puerto ${loaded.port})`);
  check(loaded.whatsappBookingNumber === null, 'sin número de WhatsApp, la configuración lo deja en null');
}

// Producción debe rechazar los marcadores (no se puede arrancar con ellos por descuido).
try {
  loadConfig({ ...Object.fromEntries(entries), APP_ENV: 'production', APP_ORIGIN: 'https://localhost:8443', COOKIE_SECURE: 'true' });
  check(false, 'producción rechaza el CSRF_SECRET ficticio');
} catch (error) {
  check(/CSRF_SECRET/.test(error.message), 'producción rechaza el CSRF_SECRET ficticio de .env.example');
}

console.log(failures === 0 ? 'Resultado: .env.example coincide con src/config.js.' : `Resultado: ${failures} diferencia(s).`);
process.exitCode = failures === 0 ? 0 : 1;
