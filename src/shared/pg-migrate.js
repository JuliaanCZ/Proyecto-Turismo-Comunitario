import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { join } from 'node:path';

const DIR = fileURLToPath(new URL('../../db/postgres/', import.meta.url));

export async function migrate(db) {
  await db.query('CREATE SCHEMA IF NOT EXISTS app');
  await db.query(`CREATE TABLE IF NOT EXISTS app.schema_migrations (
    version text PRIMARY KEY, checksum char(64) NOT NULL, applied_at bigint NOT NULL
  )`);
  const names = (await readdir(DIR)).filter((name) => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort();
  const applied = new Map((await db.query('SELECT version, checksum FROM app.schema_migrations')).rows
    .map((row) => [row.version, row.checksum.trim()]));
  const migrated = [];
  for (const name of names) {
    const version = name.slice(0, -4);
    const sql = (await readFile(join(DIR, name), 'utf8')).replace(/\r\n?/g, '\n');
    const checksum = createHash('sha256').update(sql).digest('hex');
    if (applied.has(version)) {
      if (applied.get(version) !== checksum) throw new Error(`Migración PostgreSQL modificada: ${version}`);
      continue;
    }
    await db.transaction(async () => {
      await db.query(sql);
      await db.query('INSERT INTO app.schema_migrations (version, checksum, applied_at) VALUES ($1,$2,$3)',
        [version, checksum, Date.now()]);
    });
    migrated.push(version);
  }
  return migrated;
}
