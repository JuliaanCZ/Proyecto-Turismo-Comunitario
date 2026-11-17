import assert from 'node:assert/strict';
import test from 'node:test';
import { fixedClock, systemClock } from '../../src/shared/clock.js';
import { AppError, ERROR_CATALOG } from '../../src/shared/errors.js';
import {
  formatEcuadorDateTime,
  parseEcuadorLocalDateTime,
  toEcuadorLocalDateTime,
} from '../../src/shared/time.js';

test('time: Ecuador UTC−5 ida y vuelta y rechazo de 2026-02-30', () => {
  const ms = parseEcuadorLocalDateTime('2026-12-15T09:30');
  assert.equal(ms, Date.UTC(2026, 11, 15, 14, 30));
  assert.equal(toEcuadorLocalDateTime(ms), '2026-12-15T09:30');
  assert.equal(
    formatEcuadorDateTime(ms),
    '15 de diciembre de 2026, 09:30 (hora de Ecuador)',
  );
  assert.throws(() => parseEcuadorLocalDateTime('2026-02-30T10:00'), /inválid|inexistente/i);
});

test('clock: systemClock y fixedClock con advance', () => {
  assert.equal(typeof systemClock.now(), 'number');
  const clock = fixedClock(1_000);
  assert.equal(clock.now(), 1_000);
  clock.advance(500);
  assert.equal(clock.now(), 1_500);
});

test('errors: AppError y catálogo C-ERR', () => {
  assert.equal(ERROR_CATALOG.VALIDATION_ERROR.status, 422);
  assert.equal(ERROR_CATALOG.UNAUTHENTICATED.status, 401);
  assert.equal(ERROR_CATALOG.NOT_FOUND.status, 404);
  assert.equal(ERROR_CATALOG.ORIGIN_MISMATCH.status, 403);
  assert.equal(ERROR_CATALOG.CSRF_INVALID.status, 403);
  assert.equal(ERROR_CATALOG.EMAIL_TAKEN.status, 409);
  assert.equal(ERROR_CATALOG.INVALID_CREDENTIALS.status, 401);
  assert.equal(ERROR_CATALOG.TOKEN_INVALID.status, 400);
  assert.equal(ERROR_CATALOG.NOT_IMPLEMENTED.status, 501);
  assert.equal(ERROR_CATALOG.INTERNAL_ERROR.status, 500);

  const err = new AppError('VALIDATION_ERROR', 422, 'Datos inválidos', {
    fieldErrors: { email: ['El Correo es obligatorio.'] },
    details: { hint: 'form' },
  });
  assert.ok(err instanceof Error);
  assert.equal(err.code, 'VALIDATION_ERROR');
  assert.equal(err.status, 422);
  assert.deepEqual(err.fieldErrors.email, ['El Correo es obligatorio.']);
  assert.equal(err.details.hint, 'form');
});
