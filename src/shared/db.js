import { DatabaseSync } from 'node:sqlite';

const MEMORY = ':memory:';

/**
 * Única forma de abrir la base (C-DAT, DM-03). `file` es una ruta o ':memory:'.
 * Activa claves foráneas y busy_timeout; en archivo usa WAL (en memoria no aplica).
 */
export function openDb(file) {
  if (typeof file !== 'string' || file.trim() === '') {
    throw new TypeError('openDb requiere una ruta de archivo o ":memory:".');
  }
  const db = new DatabaseSync(file);
  try {
    // busy_timeout primero: así journal_mode espera si otro proceso tiene la base.
    db.exec('PRAGMA busy_timeout = 5000');
    if (file !== MEMORY) db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
  } catch (error) {
    db.close();
    throw error;
  }
  return db;
}

/**
 * Única forma de transaccionar (C-DAT). Abre BEGIN IMMEDIATE, confirma si `fn`
 * termina y revierte si lanza; devuelve el resultado de `fn`.
 * `fn` es síncrona: DatabaseSync lo es, y una función asíncrona confirmaría
 * antes de terminar su trabajo, así que se rechaza.
 */
export function withTransaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    if (typeof result?.then === 'function') {
      throw new TypeError('withTransaction requiere una función síncrona.');
    }
    db.exec('COMMIT');
    return result;
  } catch (error) {
    if (db.isTransaction) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // El error original es el que importa; la conexión ya no está en transacción útil.
      }
    }
    throw error;
  }
}
