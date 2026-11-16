import console from 'node:console';
import process from 'node:process';
import { DatabaseSync } from 'node:sqlite';
import argon2 from 'argon2';

function checkSqlite() {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('CREATE TABLE prueba (id INTEGER PRIMARY KEY, valor TEXT NOT NULL)');
    db.prepare('INSERT INTO prueba (valor) VALUES (?)').run('dato-ficticio');
    const fila = db.prepare('SELECT valor FROM prueba WHERE id = 1').get();
    console.log('SQLite (node:sqlite, :memory:):', JSON.stringify(fila));
    return fila?.valor === 'dato-ficticio';
  } finally {
    db.close();
  }
}

async function checkArgon2() {
  const password = 'Clave-ficticia-B01';
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  const correcto = await argon2.verify(hash, password);
  const incorrecto = await argon2.verify(hash, 'otra-clave-ficticia');
  console.log('Algoritmo:', hash.split('$')[1]);
  console.log('Hash verificado:', correcto);
  console.log('Clave distinta rechazada:', !incorrecto);
  return correcto && !incorrecto;
}

const sqliteOk = checkSqlite();
const argon2Ok = await checkArgon2();
if (!sqliteOk || !argon2Ok) {
  console.error('Comprobación fallida');
  process.exitCode = 1;
} else {
  console.log('OK');
}
