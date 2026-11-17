/**
 * Política de contraseña (B1.1 / B1.3): distinta del correo y fuera de una lista corta
 * de contraseñas comunes. Longitud 10–128 la cubre el esquema C-VAL.
 */
export const COMMON_PASSWORDS = Object.freeze([
  'password', 'password123', '1234567890', '12345678901', 'qwertyuiop',
  'abcdefghij', 'letmein123', 'welcome123', 'admin12345', 'iloveyou12',
  'monkey1234', 'dragon1234', 'master1234', 'login12345', 'abc1234567',
  'passw0rd12', 'contraseña', 'clave12345', 'turismo123', 'ecuador123',
]);

const COMMON = new Set(COMMON_PASSWORDS.map((p) => p.toLowerCase()));

/**
 * @param {string} password
 * @param {string} email
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function checkPasswordPolicy(password, email) {
  if (typeof password !== 'string' || typeof email !== 'string') {
    return { ok: false, message: 'La contraseña no cumple la política.' };
  }
  if (password.toLowerCase() === email.toLowerCase()) {
    return { ok: false, message: 'La contraseña no puede ser igual al correo.' };
  }
  if (COMMON.has(password.toLowerCase())) {
    return { ok: false, message: 'Elige una contraseña menos común.' };
  }
  return { ok: true };
}
