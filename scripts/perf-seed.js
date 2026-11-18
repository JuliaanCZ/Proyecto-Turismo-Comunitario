import console from 'node:console';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { PROVINCES } from '../src/modules/offers/index.js';
import { createHasher } from '../src/modules/accounts/service/hasher.js';
import { openDb, withTransaction } from '../src/shared/db.js';
import { migrate } from '../src/shared/migrate.js';

export const PERF_OFFER_COUNT = 20;
export const PERF_EMAIL = 'perf@demo.test';

function assertPerfDatabase(file) {
  const resolved = resolve(file);
  if (basename(resolved) !== 'perf.sqlite') {
    throw new Error('La base de rendimiento debe llamarse exactamente perf.sqlite.');
  }
  return resolved;
}

function removeDatabaseFiles(file) {
  for (const candidate of [file, `${file}-wal`, `${file}-shm`]) {
    if (existsSync(candidate)) unlinkSync(candidate);
  }
}

export async function seedPerformanceDatabase({ databaseFile, config, password }) {
  const file = assertPerfDatabase(databaseFile);
  if (typeof password !== 'string' || password.length < 10) {
    throw new Error('La clave ficticia de rendimiento debe tener al menos 10 caracteres.');
  }

  mkdirSync(dirname(file), { recursive: true });
  removeDatabaseFiles(file);

  const passwordHash = await createHasher(config).hash(password);
  const db = openDb(file);
  try {
    migrate(db);
    const now = Date.now();
    const insertUser = db.prepare(`
      INSERT INTO users (email, display_name, password_hash, created_at)
      VALUES (?, ?, ?, ?)
    `);
    const insertOffer = db.prepare(`
      INSERT INTO offers (
        owner_id, title, description, province, location_text, starts_at,
        capacity, is_published, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);

    const userId = withTransaction(db, () => {
      const user = insertUser.run(PERF_EMAIL, 'Usuario de rendimiento', passwordHash, now);
      const ownerId = Number(user.lastInsertRowid);
      for (let index = 0; index < PERF_OFFER_COUNT; index += 1) {
        const number = index + 1;
        insertOffer.run(
          ownerId,
          `Oferta ficticia ${String(number).padStart(2, '0')}`,
          `Descripción ficticia para la medición reproducible número ${number}.`,
          PROVINCES[index].code,
          `Comunidad ficticia ${number}`,
          now + number * 86_400_000,
          10 + index,
          now,
          now,
        );
      }
      return ownerId;
    });

    const total = db.prepare('SELECT count(*) AS total FROM offers').get().total;
    const distribution = db.prepare(`
      SELECT province, count(*) AS total
      FROM offers GROUP BY province ORDER BY province
    `).all();
    return { databaseFile: file, userId, total, distribution };
  } finally {
    db.close();
  }
}

function printSummary(result) {
  console.log(`Base de rendimiento: ${result.databaseFile}`);
  console.log(`Ofertas creadas: ${result.total}`);
  console.log(`Provincias con datos: ${result.distribution.length} de ${PROVINCES.length}`);
  for (const row of result.distribution) console.log(`- ${row.province}: ${row.total}`);
}

async function main() {
  const databaseFile = resolve('data/perf.sqlite');
  const config = loadConfig({ ...process.env, DATABASE_FILE: databaseFile });
  const password = config.seedDemoPassword;
  if (!password) throw new Error('SEED_DEMO_PASSWORD es obligatoria para perf:seed.');
  printSummary(await seedPerformanceDatabase({ databaseFile, config, password }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Sembrado de rendimiento fallido: ${error.message}`);
    process.exitCode = 1;
  });
}
