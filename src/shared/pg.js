import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import pg from 'pg';

// Los tiempos se guardan como milisegundos UTC dentro del rango seguro de JS.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));

export function createPg(databaseUrl, { pool: injectedPool,
  caFile = process.env.DATABASE_SSL_CA_FILE } = {}) {
  if (!injectedPool && (!databaseUrl || !/^postgres(?:ql)?:\/\//.test(databaseUrl))) {
    throw new Error('DATABASE_URL debe ser una URL PostgreSQL válida.');
  }
  const pool = injectedPool ?? new pg.Pool({
    connectionString: databaseUrl,
    max: 5,
    ssl: { rejectUnauthorized: true,
      ...(caFile ? { ca: readFileSync(caFile, 'utf8') } : {}) },
    options: '-c search_path=app,public',
  });
  const transactionClient = new AsyncLocalStorage();
  return {
    async query(sql, values = []) {
      return (transactionClient.getStore() ?? pool).query(sql, values);
    },
    async transaction(work) {
      if (transactionClient.getStore()) return work();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await transactionClient.run(client, work);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}
