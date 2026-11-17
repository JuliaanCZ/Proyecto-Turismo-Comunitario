import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkPasswordPolicy,
  COMMON_PASSWORDS,
} from '../../src/modules/accounts/domain/password-policy.js';
import { registerSchema } from '../../src/modules/accounts/domain/schemas.js';
import { validate } from '../../src/shared/validation/validate.js';

const valid = {
  displayName: 'Ana Quispe',
  email: 'ana@example.test',
  password: 'Clave-segura-99',
  passwordConfirm: 'Clave-segura-99',
};

test('TM-CTA-03 (unidad): esquema y política rechazan cada regla con error por campo', () => {
  assert.equal(COMMON_PASSWORDS.length >= 20, true);
  assert.equal(validate(registerSchema, valid).ok, true);

  const cases = [
    ['displayName', 'A'],
    ['email', 'no-es-correo'],
    ['password', 'corta'],
    ['passwordConfirm', 'Clave-segura-00'],
  ];
  for (const [field, value] of cases) {
    const result = validate(registerSchema, { ...valid, [field]: value });
    assert.equal(result.ok, false, field);
    assert.ok(result.errors[field]?.length, field);
  }

  assert.equal(checkPasswordPolicy('ana@example.test', 'ana@example.test').ok, false);
  assert.equal(checkPasswordPolicy('password123', 'ana@example.test').ok, false);
  assert.equal(checkPasswordPolicy('Clave-segura-99', 'ana@example.test').ok, true);
});
