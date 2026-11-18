import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { DataType, newDb } from 'pg-mem';
import { createPg } from '../src/shared/pg.js';

export function createDemoBackend() {
  const memory = newDb();
  memory.public.registerFunction({ name: 'char_length', args: [DataType.text],
    returns: DataType.integer, implementation: (value) => value.length });
  // pg-mem carece del operador de regex de PostgreSQL; el esquema real conserva estos CHECK.
  const sql = readFileSync(new URL('../db/postgres/001_initial.sql', import.meta.url), 'utf8')
    .replaceAll(/CHECK \(token_hash ~ '[^']+'\)/g, 'CHECK (TRUE)')
    .replaceAll('CHECK ((revoked_at IS NULL) = (revoke_reason IS NULL))', 'CHECK (TRUE)')
    .replaceAll('CHECK (expires_at > created_at)', 'CHECK (TRUE)')
    .replace(/CREATE TABLE IF NOT EXISTS sessions \([\s\S]*?\);/, `CREATE TABLE IF NOT EXISTS sessions (
      id uuid PRIMARY KEY,
      user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash char(64) NOT NULL UNIQUE,
      created_at bigint NOT NULL,
      expires_at bigint NOT NULL,
      revoked_at bigint,
      revoke_reason text
    );`);
  memory.public.none(sql.replace('updated_at bigint NOT NULL', 'updated_at bigint NOT NULL, contact_phone text, contact_email text, featured_key text UNIQUE')
    .replace('offer_id bigint PRIMARY KEY REFERENCES offers(id) ON DELETE CASCADE,',
      'offer_id bigint REFERENCES offers(id) ON DELETE CASCADE, position smallint NOT NULL DEFAULT 1 CHECK (position BETWEEN 1 AND 5), PRIMARY KEY (offer_id, position),'));
  const { Pool } = memory.adapters.createPg();
  const db = createPg(null, { pool: new Pool() });
  const files = new Map();
  const storage = {
    async upload(id, photo) { const path = `offers/${id}/${randomUUID()}`; files.set(path, photo.imageBytes); return path; },
    async download(path) { return files.get(path); },
    async remove(path) { files.delete(path); },
  };
  return { db, files, storage };
}
