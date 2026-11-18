import assert from 'node:assert/strict';
import { readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadConfig } from '../../src/config.js';
import { privateListSql } from '../../src/modules/offers/data/offers.repo.js';
import { openDb } from '../../src/shared/db.js';
import { PERF_OFFER_COUNT, seedPerformanceDatabase } from '../../scripts/perf-seed.js';

test('TM-PERF-01: perf:seed crea 20 ofertas en 20 provincias y nunca toca otra base', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'turismo-perf-test-'));
  const databaseFile = join(directory, 'perf.sqlite');

  const config = loadConfig({
    APP_ENV: 'test', DATABASE_FILE: databaseFile,
    ARGON2_MEMORY_KIB: '8', ARGON2_TIME_COST: '1', ARGON2_PARALLELISM: '1',
  });
  const result = await seedPerformanceDatabase({
    databaseFile, config, password: 'Clave-ficticia-20',
  });
  assert.equal(result.total, PERF_OFFER_COUNT);
  assert.equal(result.distribution.length, 20);
  assert.ok(result.distribution.every((row) => row.total === 1));

  const db = openDb(databaseFile);
  t.after(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });
  assert.equal(db.prepare('SELECT count(*) AS total FROM users').get().total, 1);
  assert.equal(db.prepare('SELECT count(*) AS total FROM offers').get().total, 20);

  await assert.rejects(
    () => seedPerformanceDatabase({
      databaseFile: join(directory, 'desarrollo.sqlite'), config, password: 'Clave-ficticia-20',
    }),
    /exactamente perf\.sqlite/,
  );
});

test('TM-PERF-02: EXPLAIN QUERY PLAN usa idx_offers_owner_province_starts', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'turismo-perf-plan-'));
  const databaseFile = join(directory, 'perf.sqlite');
  const config = loadConfig({
    APP_ENV: 'test', DATABASE_FILE: databaseFile,
    ARGON2_MEMORY_KIB: '8', ARGON2_TIME_COST: '1', ARGON2_PARALLELISM: '1',
  });
  const result = await seedPerformanceDatabase({
    databaseFile, config, password: 'Clave-ficticia-20',
  });
  const db = openDb(databaseFile);
  t.after(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const plan = db.prepare(`EXPLAIN QUERY PLAN ${privateListSql(true)}`)
    .all(result.userId, 'PICHINCHA', 10, 0)
    .map((row) => row.detail).join('\n');
  assert.match(plan, /idx_offers_owner_province_starts/);
});

test('TM-PERF-03: el informe tiene resultados ejecutados y no conserva celdas pendientes', () => {
  const report = readFileSync(new globalThis.URL('../../docs/mvp/evidencias/B2.3/rendimiento.md', import.meta.url), 'utf8');
  assert.match(report, /Estado \| `EJECUTADO`/);
  assert.doesNotMatch(report, /\|\s*—\s*\|/);
  assert.doesNotMatch(report, /PENDIENTE DE EJECUCI[ÓO]N/);
});
