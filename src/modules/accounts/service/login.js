import { randomBytes } from 'node:crypto';
import { AppError } from '../../../shared/errors.js';
import { validate } from '../../../shared/validation/validate.js';
import { loginSchema } from '../domain/schemas.js';

const INVALID_MESSAGE = 'Correo o contraseña incorrectos.';

function invalidCredentials() {
  return AppError.fromCatalog('INVALID_CREDENTIALS', INVALID_MESSAGE);
}

/**
 * Autenticación (B1.2): si el correo no existe, verifica igual contra un hash ficticio
 * generado con los mismos parámetros Argon2id para igualar el costo.
 */
export function createLogin({ hasher, users }) {
  let dummyHashPromise = null;
  function getDummyHash() {
    if (!dummyHashPromise) {
      dummyHashPromise = hasher.hash(randomBytes(32).toString('base64url'));
    }
    return dummyHashPromise;
  }

  return {
    async authenticate(emailInput, passwordInput) {
      const incoming = typeof emailInput === 'object' && emailInput !== null
        ? emailInput
        : { email: emailInput, password: passwordInput };
      const parsed = validate(loginSchema, incoming);
      if (!parsed.ok) {
        // Formato inválido o vacío en llamada directa al servicio: mismo error de credenciales.
        await hasher.verify(await getDummyHash(), String(incoming.password ?? 'x'));
        throw invalidCredentials();
      }

      const { email, password } = parsed.values;
      const user = users.findByEmail(email);
      if (!user) {
        await hasher.verify(await getDummyHash(), password);
        throw invalidCredentials();
      }

      const ok = await hasher.verify(user.password_hash, password);
      if (!ok) throw invalidCredentials();

      return {
        userId: user.id,
        email: user.email,
        displayName: user.display_name,
      };
    },
  };
}
