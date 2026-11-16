import process from 'node:process';
import { URL } from 'node:url';

const developmentDefaults = Object.freeze({
  CSRF_SECRET: 'ejemplo-local-csrf-solo-para-desarrollo',
  DEMO_MAILBOX_PASSWORD: 'ejemplo-bandeja-local',
  SEED_DEMO_PASSWORD: 'ejemplo-semilla-local',
});

function invalid(name, expectation) {
  throw new Error(`Configuración inválida: ${name} ${expectation}.`);
}

function integer(env, name, fallback, min, max = Number.MAX_SAFE_INTEGER) {
  const raw = env[name] ?? String(fallback);
  const value = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < min || value > max) {
    invalid(name, `debe ser un entero entre ${min} y ${max}`);
  }
  return value;
}

function boolean(env, name, fallback) {
  const raw = env[name] ?? String(fallback);
  if (raw === 'true' || raw === 'false') return raw === 'true';
  invalid(name, 'debe ser true o false');
}

function appOrigin(raw, production) {
  let origin;
  try {
    origin = new URL(raw);
  } catch {
    invalid('APP_ORIGIN', 'debe ser un origen HTTP o HTTPS válido');
  }
  if (
    !['http:', 'https:'].includes(origin.protocol)
    || raw !== origin.origin
    || (production && origin.protocol !== 'https:')
  ) {
    invalid('APP_ORIGIN', 'debe ser un origen canónico sin ruta y usar HTTPS en producción');
  }
  return origin.origin;
}

function secret(env, name, fallback, { production, required, minLength }) {
  const value = env[name] ?? (production ? '' : fallback);
  if (!value && !required) return null;
  if (value.trim().length < minLength || (production && value === fallback)) {
    invalid(name, `debe configurarse con al menos ${minLength} caracteres`);
  }
  return value;
}

export function loadConfig(env = process.env) {
  const appEnv = env.APP_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(appEnv)) {
    invalid('APP_ENV', 'debe ser development, test o production');
  }

  const production = appEnv === 'production';
  const port = integer(env, 'PORT', 3000, 1, 65535);
  const origin = appOrigin(env.APP_ORIGIN ?? (production ? '' : `http://localhost:${port}`), production);
  const databaseFile = env.DATABASE_FILE ?? './data/app.sqlite';
  if (!databaseFile.trim() || /[\x00-\x1f]/.test(databaseFile) || (production && databaseFile === ':memory:')) {
    invalid('DATABASE_FILE', 'debe identificar un archivo válido');
  }

  const whatsappBookingNumber = env.WHATSAPP_BOOKING_NUMBER ?? '';
  if (whatsappBookingNumber && !/^[1-9]\d{7,14}$/.test(whatsappBookingNumber)) {
    invalid('WHATSAPP_BOOKING_NUMBER', 'debe contener entre 8 y 15 dígitos en formato internacional');
  }

  const cookieSecure = boolean(env, 'COOKIE_SECURE', production);
  if (production && !cookieSecure) invalid('COOKIE_SECURE', 'debe ser true en producción');
  const demoMailboxEnabled = boolean(env, 'DEMO_MAILBOX_ENABLED', !production);

  const argon2Parallelism = integer(env, 'ARGON2_PARALLELISM', 1, 1);
  const argon2MemoryKib = integer(env, 'ARGON2_MEMORY_KIB', 19456, 8);
  if (argon2Parallelism > Math.floor(argon2MemoryKib / 8)) {
    invalid('ARGON2_MEMORY_KIB', 'debe ser al menos ocho veces ARGON2_PARALLELISM');
  }

  return Object.freeze({
    appEnv,
    port,
    appOrigin: origin,
    databaseFile,
    whatsappBookingNumber: whatsappBookingNumber || null,
    sessionTtlHours: integer(env, 'SESSION_TTL_HOURS', 8, 1),
    cookieSecure,
    trustProxy: integer(env, 'TRUST_PROXY', 0, 0),
    csrfSecret: secret(env, 'CSRF_SECRET', developmentDefaults.CSRF_SECRET, {
      production, required: true, minLength: 32,
    }),
    argon2MemoryKib,
    argon2TimeCost: integer(env, 'ARGON2_TIME_COST', 2, 1),
    argon2Parallelism,
    demoMailboxEnabled,
    demoMailboxPassword: secret(env, 'DEMO_MAILBOX_PASSWORD', developmentDefaults.DEMO_MAILBOX_PASSWORD, {
      production, required: demoMailboxEnabled, minLength: 8,
    }),
    seedDemoPassword: secret(env, 'SEED_DEMO_PASSWORD', developmentDefaults.SEED_DEMO_PASSWORD, {
      production, required: false, minLength: 8,
    }),
  });
}
