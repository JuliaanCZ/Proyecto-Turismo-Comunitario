import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validate } from '../../src/shared/validation/validate.js';

const validatePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../src/shared/validation/validate.js',
);

test('TM-VAL-01: campos obligatorios, recorte y mensajes por campo', () => {
  const schema = {
    nombre: { type: 'string', label: 'Nombre', required: true, min: 2, max: 80 },
    cupo: { type: 'int', label: 'Cupo', required: true, min: 1, max: 100 },
  };

  const empty = validate(schema, { nombre: '   ', cupo: '' });
  assert.equal(empty.ok, false);
  assert.deepEqual(empty.errors.nombre, ['El Nombre es obligatorio.']);
  assert.deepEqual(empty.errors.cupo, ['El Cupo es obligatorio.']);

  const trimmed = validate(schema, { nombre: '  Ana  ', cupo: '10' });
  assert.equal(trimmed.ok, true);
  assert.equal(trimmed.values.nombre, 'Ana');
  assert.equal(trimmed.values.cupo, 10);
  assert.deepEqual(trimmed.errors, {});
});

test('TM-VAL-02: longitudes en puntos de código (emoji = 1) y NFC', () => {
  const schema = {
    titulo: { type: 'string', label: 'Título', required: true, min: 1, max: 2 },
  };

  const emojiOk = validate(schema, { titulo: '😀' });
  assert.equal(emojiOk.ok, true);
  assert.equal(emojiOk.values.titulo, '😀');

  const tooLong = validate(schema, { titulo: '😀😀😀' });
  assert.equal(tooLong.ok, false);
  assert.match(tooLong.errors.titulo[0], /máximo|como máximo/i);

  const nfc = validate(schema, { titulo: 'e\u0301' });
  assert.equal(nfc.ok, true);
  assert.equal(nfc.values.titulo, 'é');
  assert.equal([...nfc.values.titulo].length, 1);
});

test('TM-VAL-03: enteros estrictos y rangos', () => {
  const schema = {
    cupo: { type: 'int', label: 'Cupo', required: true, min: 1, max: 10 },
  };

  for (const bad of ['1.5', '1e3', 'abc']) {
    const result = validate(schema, { cupo: bad });
    assert.equal(result.ok, false, `debería rechazar ${bad}`);
    assert.ok(result.errors.cupo?.length >= 1);
  }

  assert.equal(validate(schema, { cupo: '0' }).ok, false);
  assert.equal(validate(schema, { cupo: '11' }).ok, false);
  assert.equal(validate(schema, { cupo: '5' }).ok, true);
  assert.equal(validate(schema, { cupo: '5' }).values.cupo, 5);
});

test('TM-VAL-04: correo válido, inválido, minúsculas y máximo 254', () => {
  const schema = {
    email: { type: 'email', label: 'Correo', required: true },
  };

  const ok = validate(schema, { email: '  Ana.Perez@EPN.EDU.EC  ' });
  assert.equal(ok.ok, true);
  assert.equal(ok.values.email, 'ana.perez@epn.edu.ec');

  assert.equal(validate(schema, { email: 'sin-arroba' }).ok, false);
  assert.equal(validate(schema, { email: 'a@b' }).ok, false);

  const longLocal = `${'a'.repeat(64)}@ejemplo.com`;
  assert.equal(validate(schema, { email: longLocal }).ok, true);

  const tooLong = `${'a'.repeat(243)}@ejemplo.com`;
  assert.ok(tooLong.length > 254);
  assert.equal(validate(schema, { email: tooLong }).ok, false);
});

test('TM-VAL-05: equalsField y enum', () => {
  const schema = {
    password: { type: 'string', label: 'Contraseña', required: true, min: 10, max: 128 },
    passwordConfirm: {
      type: 'string',
      label: 'Confirmación',
      required: true,
      equalsField: 'password',
    },
    provincia: {
      type: 'enum',
      label: 'Provincia',
      required: true,
      values: ['Pichincha', 'Guayas'],
    },
  };

  const mismatch = validate(schema, {
    password: 'secreto1234',
    passwordConfirm: 'otrosecreto',
    provincia: 'Pichincha',
  });
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.errors.passwordConfirm[0], /coincid|igual/i);

  const badEnum = validate(schema, {
    password: 'secreto1234',
    passwordConfirm: 'secreto1234',
    provincia: 'Madrid',
  });
  assert.equal(badEnum.ok, false);
  assert.ok(badEnum.errors.provincia?.length >= 1);

  const ok = validate(schema, {
    password: 'secreto1234',
    passwordConfirm: 'secreto1234',
    provincia: 'Guayas',
  });
  assert.equal(ok.ok, true);
});

test('TM-VAL-06: localDateTime Ecuador ida/vuelta y rechazo de fecha inexistente', () => {
  const schema = {
    startsAt: { type: 'localDateTime', label: 'Inicio', required: true },
  };

  const bad = validate(schema, { startsAt: '2026-02-30T10:00' });
  assert.equal(bad.ok, false);

  const ok = validate(schema, { startsAt: '2026-12-15T09:30' });
  assert.equal(ok.ok, true);
  assert.equal(ok.values.startsAt, '2026-12-15T09:30');
});

test('TM-VAL-07: validate.js no contiene import, require ni node:', () => {
  const source = readFileSync(validatePath, 'utf8');
  assert.equal(/import\b/.test(source), false);
  assert.equal(/\brequire\b/.test(source), false);
  assert.equal(/node:/.test(source), false);
  assert.equal(typeof validate, 'function');
});
