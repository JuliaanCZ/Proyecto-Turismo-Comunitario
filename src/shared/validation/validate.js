/**
 * Validación pura C-VAL (Node y navegador). Sin dependencias de Node.
 * Longitudes en puntos de código Unicode.
 */

const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
const LOCAL_DT_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const INT_RE = /^-?\d+$/;

function codePoints(text) {
  return [...text].length;
}

function collapseSpaces(text) {
  return text.replace(/\s+/g, ' ');
}

function normalizeString(raw) {
  if (raw === null || raw === undefined) return '';
  return collapseSpaces(String(raw).normalize('NFC')).trim();
}

function isBlank(value) {
  return value === '' || value === null || value === undefined;
}

function pushError(errors, field, message) {
  if (!errors[field]) errors[field] = [];
  errors[field].push(message);
}

function msg(rule, fallback) {
  return rule.message || fallback;
}

function isValidLocalDateTime(value) {
  const m = LOCAL_DT_RE.exec(value);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  if (hour > 23 || minute > 59) return false;
  const probe = Date.UTC(year, month - 1, day, hour, minute);
  if (Number.isNaN(probe)) return false;
  const d = new Date(probe);
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day &&
    d.getUTCHours() === hour &&
    d.getUTCMinutes() === minute
  );
}

/**
 * @param {Record<string, object>} schema
 * @param {Record<string, unknown>} input
 * @returns {{ ok: boolean, values: Record<string, unknown>, errors: Record<string, string[]> }}
 */
export function validate(schema, input) {
  const values = {};
  const errors = {};
  const raw = input && typeof input === 'object' ? input : {};

  for (const [field, rule] of Object.entries(schema)) {
    const label = rule.label || field;
    const type = rule.type || 'string';
    let incoming = raw[field];

    if (rule.preserveExact) {
      // Contraseñas y similares: sin recorte, NFC ni colapso (equalsField compara bytes lógicos exactos).
      incoming = incoming === null || incoming === undefined ? '' : String(incoming);
    } else if (type === 'string' || type === 'email' || type === 'localDateTime' || type === 'enum') {
      incoming = normalizeString(incoming);
    } else if (type === 'int') {
      incoming = incoming === null || incoming === undefined ? '' : String(incoming).trim();
    }

    if (isBlank(incoming)) {
      if (rule.required) {
        pushError(errors, field, msg(rule, `El ${label} es obligatorio.`));
      }
      continue;
    }

    if (type === 'string') {
      const len = codePoints(incoming);
      if (rule.min !== undefined && rule.min !== null && len < rule.min) {
        pushError(errors, field, msg(rule, `El ${label} debe tener al menos ${rule.min} caracteres.`));
      }
      if (rule.max !== undefined && rule.max !== null && len > rule.max) {
        pushError(errors, field, msg(rule, `El ${label} admite como máximo ${rule.max} caracteres.`));
      }
      if (rule.pattern) {
        const re = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern);
        if (!re.test(incoming)) {
          pushError(errors, field, msg(rule, `El ${label} no tiene un formato válido.`));
        }
      }
      if (!errors[field]) values[field] = incoming;
      continue;
    }

    if (type === 'int') {
      if (!INT_RE.test(incoming) || /[eE.]/.test(incoming)) {
        pushError(errors, field, msg(rule, `El ${label} debe ser un número entero.`));
        continue;
      }
      const n = Number(incoming);
      if (!Number.isSafeInteger(n)) {
        pushError(errors, field, msg(rule, `El ${label} debe ser un número entero.`));
        continue;
      }
      if (rule.min !== undefined && rule.min !== null && n < rule.min) {
        pushError(errors, field, msg(rule, `El ${label} debe ser al menos ${rule.min}.`));
      }
      if (rule.max !== undefined && rule.max !== null && n > rule.max) {
        pushError(errors, field, msg(rule, `El ${label} debe ser como máximo ${rule.max}.`));
      }
      if (!errors[field]) values[field] = n;
      continue;
    }

    if (type === 'email') {
      const email = incoming.toLowerCase();
      if (codePoints(email) > 254 || !EMAIL_RE.test(email)) {
        pushError(errors, field, msg(rule, `El ${label} no tiene un formato válido.`));
      } else if (!errors[field]) {
        values[field] = email;
      }
      continue;
    }

    if (type === 'localDateTime') {
      if (!isValidLocalDateTime(incoming)) {
        pushError(errors, field, msg(rule, `El ${label} no es una fecha y hora válidas.`));
      } else if (!errors[field]) {
        values[field] = incoming;
      }
      continue;
    }

    if (type === 'enum') {
      const allowed = rule.values || [];
      if (!allowed.includes(incoming)) {
        pushError(errors, field, msg(rule, `El ${label} no es una opción válida.`));
      } else if (!errors[field]) {
        values[field] = incoming;
      }
      continue;
    }

    pushError(errors, field, msg(rule, `El ${label} tiene un tipo no soportado.`));
  }

  for (const [field, rule] of Object.entries(schema)) {
    if (!rule.equalsField || errors[field]) continue;
    if (!(field in values) && !(rule.equalsField in values)) continue;
    if (values[field] !== values[rule.equalsField]) {
      const label = rule.label || field;
      pushError(errors, field, msg(rule, `El ${label} debe coincidir.`));
      delete values[field];
    }
  }

  return { ok: Object.keys(errors).length === 0, values, errors };
}
