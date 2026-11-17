import test from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../../src/shared/validation/validate.js';
import { offerSchema } from '../../src/modules/offers/domain/schemas.js';
import { PROVINCES, provinceLabel } from '../../src/modules/offers/domain/provinces.js';
import { normalizePage } from '../../src/modules/offers/domain/pagination.js';

test('TM-OFE-02: provincias, límites, tipos y formato generan errores por campo', () => {
  assert.equal(PROVINCES.length, 24);
  assert.equal(new Set(PROVINCES.map((p) => p.code)).size, 24);
  assert.equal(provinceLabel('PICHINCHA'), 'Pichincha');
  const valid = { title: 'Ruta Andina', description: 'Experiencia comunitaria de prueba.',
    province: 'PICHINCHA', locationText: 'Centro comunal', startsAt: '2026-12-20T09:00', capacity: 10 };
  assert.equal(validate(offerSchema, valid).ok, true);
  for (const [field, value] of Object.entries({ title: 'a', description: 'corta',
    province: 'DESCONOCIDA', locationText: 'a', startsAt: '2026-02-30T09:00', capacity: 1.5 })) {
    const result = validate(offerSchema, { ...valid, [field]: value });
    assert.equal(result.ok, false, field);
    assert.ok(result.errors[field]?.length, field);
  }
  assert.ok(validate(offerSchema, { ...valid, title: 'x'.repeat(121) }).errors.title);
  assert.ok(validate(offerSchema, { ...valid, description: 'x'.repeat(2001) }).errors.description);
  assert.ok(validate(offerSchema, { ...valid, capacity: 1001 }).errors.capacity);
  assert.equal(normalizePage('999', 25), 3);
  assert.equal(normalizePage('oops', 25), 1);
});
