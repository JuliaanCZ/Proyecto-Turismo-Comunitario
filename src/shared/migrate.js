import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { withTransaction } from './db.js';

export const defaultMigrationsDir = fileURLToPath(new URL('../../db/migrations/', import.meta.url));

const FILE_NAME = /^(\d{3})_[a-z0-9_]+\.sql$/;

// Mismo contenido en Windows y Linux: sin BOM ni CRLF, para que el checksum no
// dependa de cómo Git o el editor escribieron el archivo.
function normalize(text) {
  return text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

function loadMigrations(dir) {
  const names = readdirSync(dir).filter((name) => name.endsWith('.sql')).sort();
  const seen = new Map();
  return names.map((name) => {
    const match = FILE_NAME.exec(name);
    if (!match) {
      throw new Error(`Nombre de migración inválido: ${name} (se espera NNN_descripcion.sql en minúsculas).`);
    }
    if (seen.has(match[1])) {
      throw new Error(`Número de migración repetido: ${seen.get(match[1])} y ${name}.`);
    }
    seen.set(match[1], name);
    const sql = normalize(readFileSync(join(dir, name), 'utf8'));
    return {
      version: name.slice(0, -'.sql'.length),
      sql,
      checksum: createHash('sha256').update(sql).digest('hex'),
    };
  });
}

// schema_migrations la crea 001_base.sql: antes de esa migración no existe.
function readApplied(db) {
  const exists = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
    .get();
  if (!exists) return new Map();
  const rows = db.prepare('SELECT version, checksum FROM schema_migrations').all();
  return new Map(rows.map((row) => [row.version, row.checksum]));
}

function verifyApplied(applied, migrations) {
  const byVersion = new Map(migrations.map((migration) => [migration.version, migration]));
  for (const [version, checksum] of applied) {
    const migration = byVersion.get(version);
    if (!migration) {
      throw new Error(
        `La migración ya aplicada ${version} no existe en db/migrations. No se borra una migración integrada.`,
      );
    }
    if (migration.checksum !== checksum) {
      throw new Error(
        `La migración ${version}.sql cambió después de aplicarse (checksum distinto). `
        + 'No se edita una migración integrada: añade una migración nueva.',
      );
    }
  }
}

/**
 * Aplica las migraciones pendientes de `dir` en orden lexicográfico, una
 * transacción por archivo. Reejecutar no cambia nada. Devuelve las versiones
 * aplicadas en esta llamada. Los archivos SQL no llevan BEGIN/COMMIT propios.
 */
export function migrate(db, { dir = defaultMigrationsDir, now = Date.now } = {}) {
  const migrations = loadMigrations(dir);
  verifyApplied(readApplied(db), migrations);

  const appliedNow = [];
  for (const migration of migrations) {
    const wasApplied = withTransaction(db, () => {
      // Se vuelve a leer dentro de la transacción: otro proceso pudo aplicarla.
      const applied = readApplied(db);
      if (applied.has(migration.version)) {
        verifyApplied(new Map([[migration.version, applied.get(migration.version)]]), [migration]);
        return false;
      }
      db.exec(migration.sql);
      db.prepare('INSERT INTO schema_migrations (version, checksum, applied_at) VALUES (?, ?, ?)')
        .run(migration.version, migration.checksum, now());
      return true;
    });
    if (wasApplied) appliedNow.push(migration.version);
  }
  return appliedNow;
}
