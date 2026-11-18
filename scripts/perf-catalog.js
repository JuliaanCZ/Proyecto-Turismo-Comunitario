import console from 'node:console';
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { cpus, platform, release, totalmem } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { tmpdir } from 'node:os';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createContainer } from '../src/container.js';
import { privateListSql } from '../src/modules/offers/data/offers.repo.js';
import { createHttpServer } from '../src/server.js';
import { openDb } from '../src/shared/db.js';
import { PERF_EMAIL } from './perf-seed.js';

const WARMUP = 50;
const SAMPLES = 1000;
const CONCURRENCY = 10;
const REPETITIONS = 3;
const INDEX = 'idx_offers_owner_province_starts';

function parseOptions(argv) {
  const unknown = argv.filter((arg) => arg !== '--sin-indice');
  if (unknown.length > 0) throw new Error(`Opción desconocida: ${unknown[0]}`);
  return { withoutIndex: argv.includes('--sin-indice') };
}

function nearestRank(values, percentile) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * percentile) - 1)];
}

function summarize(values, errors, totalMs) {
  if (values.length === 0) throw new Error('No hubo respuestas correctas para calcular métricas.');
  return {
    medianMs: nearestRank(values, 0.5),
    p95Ms: nearestRank(values, 0.95),
    minMs: Math.min(...values),
    maxMs: Math.max(...values),
    errors,
    totalSeconds: totalMs / 1000,
    requestsPerSecond: (values.length + errors) / (totalMs / 1000),
  };
}

async function runBatch({ url, cookie, count, concurrency }) {
  const values = [];
  let errors = 0;
  let next = 0;
  const started = performance.now();
  const workers = Array.from({ length: concurrency }, async () => {
    while (next < count) {
      next += 1;
      const requestStarted = performance.now();
      try {
        const response = await globalThis.fetch(url, { headers: { Cookie: cookie } });
        await response.arrayBuffer();
        if (response.status === 200) values.push(performance.now() - requestStarted);
        else errors += 1;
      } catch {
        errors += 1;
      }
    }
  });
  await Promise.all(workers);
  return { values, errors, totalMs: performance.now() - started };
}

async function measureHttp({ baseUrl, cookie, path }) {
  const warmup = await runBatch({
    url: `${baseUrl}${path}`, cookie, count: WARMUP, concurrency: CONCURRENCY,
  });
  if (warmup.errors > 0) throw new Error(`El calentamiento de ${path} tuvo ${warmup.errors} errores.`);

  const repetitions = [];
  for (let repetition = 1; repetition <= REPETITIONS; repetition += 1) {
    const batch = await runBatch({
      url: `${baseUrl}${path}`, cookie, count: SAMPLES, concurrency: CONCURRENCY,
    });
    repetitions.push({ repetition, ...summarize(batch.values, batch.errors, batch.totalMs) });
  }
  return repetitions;
}

function measureSql(db, ownerId) {
  const sql = privateListSql(true);
  const statement = db.prepare(sql);
  const values = [];
  for (let index = 0; index < SAMPLES; index += 1) {
    const started = performance.now();
    statement.all(ownerId, 'PICHINCHA', 10, 0);
    values.push(performance.now() - started);
  }
  const plan = db.prepare(`EXPLAIN QUERY PLAN ${sql}`)
    .all(ownerId, 'PICHINCHA', 10, 0)
    .map((row) => row.detail);
  return { ...summarize(values, 0, values.reduce((sum, value) => sum + value, 0)), plan };
}

async function login(baseUrl, origin, password) {
  const body = new globalThis.URLSearchParams({ email: PERF_EMAIL, password });
  const response = await globalThis.fetch(`${baseUrl}/ingreso`, {
    method: 'POST', redirect: 'manual',
    headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (response.status !== 302) throw new Error(`El ingreso real respondió ${response.status}.`);
  const cookie = response.headers.get('set-cookie')?.split(';', 1)[0];
  if (!cookie) throw new Error('El ingreso real no entregó la cookie de sesión.');
  return cookie;
}

function prepareDatabase(source, withoutIndex) {
  if (!existsSync(source)) throw new Error('Falta data/perf.sqlite; ejecuta primero npm run perf:seed.');
  if (!withoutIndex) return { databaseFile: source, temporaryDirectory: null };

  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'turismo-b23-'));
  const databaseFile = join(temporaryDirectory, 'perf.sqlite');
  copyFileSync(source, databaseFile);
  const db = openDb(databaseFile);
  try {
    db.exec(`DROP INDEX ${INDEX}`);
  } finally {
    db.close();
  }
  return { databaseFile, temporaryDirectory };
}

function perfConfig(databaseFile) {
  return loadConfig({
    ...process.env,
    APP_ENV: 'production',
    APP_ORIGIN: 'https://perf.local',
    COOKIE_SECURE: 'true',
    DATABASE_FILE: databaseFile,
    DEMO_MAILBOX_ENABLED: 'false',
    DEMO_MAILBOX_PASSWORD: '',
    CSRF_SECRET: randomBytes(32).toString('base64url'),
    SEED_DEMO_PASSWORD: '',
  });
}

async function listen(server) {
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  return `http://127.0.0.1:${server.address().port}`;
}

async function closeServer(io, httpServer) {
  await new Promise((resolveClose) => io.close(resolveClose));
  if (httpServer.listening) {
    await new Promise((resolveClose, reject) => httpServer.close((error) => (error ? reject(error) : resolveClose())));
  }
}

async function main() {
  const { withoutIndex } = parseOptions(process.argv.slice(2));
  const password = process.env.SEED_DEMO_PASSWORD ?? 'ejemplo-semilla-local';
  const prepared = prepareDatabase(resolve('data/perf.sqlite'), withoutIndex);
  process.env.NODE_ENV = 'production';

  let container;
  let server;
  try {
    const config = perfConfig(prepared.databaseFile);
    container = createContainer(config);
    const created = createHttpServer(createApp(container), container);
    server = created;
    const baseUrl = await listen(created.httpServer);
    const cookie = await login(baseUrl, config.appOrigin, password);
    const owner = container.db.prepare('SELECT id FROM users WHERE email = ?').get(PERF_EMAIL);
    if (!owner) throw new Error('No existe el usuario de rendimiento.');

    const targets = [
      { name: 'filtrado-pichincha-pagina-1', path: '/panel/ofertas?provincia=PICHINCHA&pagina=1' },
      { name: 'sin-filtro-pagina-2', path: '/panel/ofertas?pagina=2' },
    ];
    const http = [];
    for (const target of targets) {
      http.push({ ...target, repetitions: await measureHttp({ baseUrl, cookie, path: target.path }) });
    }

    const sqliteVersion = container.db.prepare('SELECT sqlite_version() AS version').get().version;
    const result = {
      variant: withoutIndex ? 'sin-indice' : 'con-indice',
      measuredAtUtc: new Date().toISOString(),
      environment: {
        node: process.version,
        sqlite: sqliteVersion,
        operatingSystem: `${platform()} ${release()}`,
        cpu: cpus()[0]?.model ?? 'desconocida',
        cpuLogicalCores: cpus().length,
        memoryBytes: totalmem(),
        nodeEnv: process.env.NODE_ENV,
      },
      parameters: { offers: 20, warmup: WARMUP, samples: SAMPLES, concurrency: CONCURRENCY, repetitions: REPETITIONS },
      http,
      sql: measureSql(container.db, owner.id),
    };
    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (server) await closeServer(server.io, server.httpServer);
    container?.close();
    if (prepared.temporaryDirectory) rmSync(prepared.temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`Medición fallida: ${error.message}`);
  process.exitCode = 1;
});
