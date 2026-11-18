import { isIP } from 'node:net';
import process from 'node:process';
import { URL } from 'node:url';
import { validate } from './shared/validation/validate.js';

export const DEMO_ACCOUNT = Object.freeze({ displayName: 'Ana Quispe', email: 'ana@demo.test' });
export const DEMO_CHAT_ACCOUNT = Object.freeze({ displayName: 'Luis Chasipanta', email: 'luis@demo.test' });

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

function resendConfig(env) {
  const apiKey = env.RESEND_API_KEY?.trim();
  const fromEmail = env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey && !fromEmail) return null;
  if (!/^re_\S+$/.test(apiKey ?? '')) invalid('RESEND_API_KEY', 'debe contener una clave de Resend');

  const sender = validate({ email: { type: 'email', required: true } }, { email: fromEmail });
  if (!sender.ok) invalid('RESEND_FROM_EMAIL', 'debe ser una dirección de un dominio verificado en Resend');
  return Object.freeze({ apiKey, fromEmail: sender.values.email });
}

export function loadConfig(env = process.env) {
  const appEnv = env.APP_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(appEnv)) {
    invalid('APP_ENV', 'debe ser development, test o production');
  }

  const production = appEnv === 'production';
  const port = integer(env, 'PORT', 3000, 1, 65535);
  const bindHost = env.BIND_HOST?.trim() || undefined;
  if (bindHost && !isIP(bindHost)) invalid('BIND_HOST', 'debe ser una dirección IPv4 o IPv6');
  const origin = appOrigin(env.APP_ORIGIN ?? (production ? '' : `http://localhost:${port}`), production);
  const databaseUrl = env.DATABASE_URL ?? '';
  if (databaseUrl && !/^postgres(?:ql)?:\/\//.test(databaseUrl)) {
    invalid('DATABASE_URL', 'debe ser una URL PostgreSQL válida');
  }
  const supabaseUrl = env.SUPABASE_URL ?? '';
  if (supabaseUrl && !/^https:\/\/[^/]+$/.test(supabaseUrl)) {
    invalid('SUPABASE_URL', 'debe ser un origen HTTPS sin ruta');
  }
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  const cookieSecure = boolean(env, 'COOKIE_SECURE', production);
  if (production && !cookieSecure) invalid('COOKIE_SECURE', 'debe ser true en producción');
  const demoMailboxEnabled = !production && boolean(env, 'DEMO_MAILBOX_ENABLED', true);
  const resend = production ? resendConfig(env) : null;

  const argon2Parallelism = integer(env, 'ARGON2_PARALLELISM', 1, 1);
  const argon2MemoryKib = integer(env, 'ARGON2_MEMORY_KIB', 19456, 8);
  if (argon2Parallelism > Math.floor(argon2MemoryKib / 8)) {
    invalid('ARGON2_MEMORY_KIB', 'debe ser al menos ocho veces ARGON2_PARALLELISM');
  }

  return Object.freeze({
    appEnv,
    port,
    bindHost,
    appOrigin: origin,
    databaseUrl,
    supabaseUrl,
    supabaseServiceRoleKey,
    supabaseBucket: 'site-imgs',
    sessionTtlHours: integer(env, 'SESSION_TTL_HOURS', 8, 1),
    cookieSecure,
    trustProxy: integer(env, 'TRUST_PROXY', 0, 0),
    csrfSecret: secret(env, 'CSRF_SECRET', developmentDefaults.CSRF_SECRET, {
      production, required: true, minLength: 32,
    }),
    argon2MemoryKib,
    argon2TimeCost: integer(env, 'ARGON2_TIME_COST', 2, 1),
    argon2Parallelism,
    demoLoginEnabled: appEnv === 'development' && boolean(env, 'DEMO_LOGIN_ENABLED', false),
    demoMailboxEnabled,
    resend,
    recoveryEnabled: demoMailboxEnabled || resend !== null,
    demoMailboxPassword: demoMailboxEnabled ? secret(env, 'DEMO_MAILBOX_PASSWORD', developmentDefaults.DEMO_MAILBOX_PASSWORD, {
      production, required: true, minLength: 8,
    }) : null,
    seedDemoPassword: !production ? secret(env, 'SEED_DEMO_PASSWORD', developmentDefaults.SEED_DEMO_PASSWORD, {
      production, required: false, minLength: 8,
    }) : null,
  });
}
