import { PROVINCES } from './provinces.js';

export const offerSchema = Object.freeze({
  title: { type: 'string', label: 'título', required: true, min: 5, max: 120 },
  description: { type: 'string', label: 'descripción', required: true, min: 20, max: 2000 },
  province: { type: 'enum', label: 'provincia', required: true, values: PROVINCES.map((p) => p.code) },
  locationText: { type: 'string', label: 'ubicación', required: true, min: 5, max: 200 },
  startsAt: { type: 'localDateTime', label: 'fecha y hora', required: true },
  capacity: { type: 'int', label: 'cupo', required: true, min: 1, max: 1000 },
  contactPhone: { type: 'string', label: 'teléfono', max: 30, pattern: '^(?:\\+|0)[0-9 ()-]+$' },
  contactEmail: { type: 'email', label: 'correo', max: 254 },
});
