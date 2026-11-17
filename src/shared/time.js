/** Zona fija de Ecuador continental: UTC−5, sin horario de verano. */
export const ECUADOR_OFFSET_MS = -5 * 60 * 60 * 1000;

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Interpreta `YYYY-MM-DDTHH:mm` como hora de Ecuador y devuelve ms UTC.
 * Rechaza fechas de calendario inexistentes (p. ej. 2026-02-30).
 */
export function parseEcuadorLocalDateTime(value) {
  if (typeof value !== 'string' || !LOCAL_RE.test(value)) {
    throw new Error('Fecha y hora inválidas.');
  }
  const [, ys, ms, ds, hs, mins] = value.match(LOCAL_RE);
  const year = Number(ys);
  const month = Number(ms);
  const day = Number(ds);
  const hour = Number(hs);
  const minute = Number(mins);

  if (hour > 23 || minute > 59) {
    throw new Error('Fecha y hora inválidas.');
  }

  // Validar calendario en componentes locales (como si fueran UTC).
  const probe = Date.UTC(year, month - 1, day, hour, minute);
  if (
    Number.isNaN(probe) ||
    new Date(probe).getUTCFullYear() !== year ||
    new Date(probe).getUTCMonth() !== month - 1 ||
    new Date(probe).getUTCDate() !== day ||
    new Date(probe).getUTCHours() !== hour ||
    new Date(probe).getUTCMinutes() !== minute
  ) {
    throw new Error('Fecha inexistente.');
  }

  // Ecuador local = UTC + 5 h → instante UTC = componentes locales + 5 h.
  return Date.UTC(year, month - 1, day, hour, minute) - ECUADOR_OFFSET_MS;
}

/** Convierte ms UTC a `YYYY-MM-DDTHH:mm` en hora de Ecuador. */
export function toEcuadorLocalDateTime(ms) {
  const local = new Date(ms + ECUADOR_OFFSET_MS);
  return `${local.getUTCFullYear()}-${pad2(local.getUTCMonth() + 1)}-${pad2(local.getUTCDate())}T${pad2(local.getUTCHours())}:${pad2(local.getUTCMinutes())}`;
}

/** Formato legible: «15 de diciembre de 2026, 09:30 (hora de Ecuador)». */
export function formatEcuadorDateTime(ms) {
  const local = new Date(ms + ECUADOR_OFFSET_MS);
  const day = local.getUTCDate();
  const month = MONTHS_ES[local.getUTCMonth()];
  const year = local.getUTCFullYear();
  const time = `${pad2(local.getUTCHours())}:${pad2(local.getUTCMinutes())}`;
  return `${day} de ${month} de ${year}, ${time} (hora de Ecuador)`;
}
