import { AppError } from '../../../shared/errors.js';
import { validate } from '../../../shared/validation/validate.js';
import { checkPasswordPolicy } from '../domain/password-policy.js';
import { registerSchema } from '../domain/schemas.js';

function isUniqueEmailViolation(error) {
  return error?.code === '23505'
    || (typeof error?.message === 'string' && /UNIQUE/i.test(error.message));
}

export function createRegister({ clock, hasher, users }) {
  return {
    async registerUser(input) {
      const result = validate(registerSchema, input);
      if (!result.ok) {
        throw AppError.fromCatalog('VALIDATION_ERROR', 'Revisa los campos indicados.', {
          fieldErrors: result.errors,
        });
      }

      const { displayName, email, password } = result.values;
      const policy = checkPasswordPolicy(password, email);
      if (!policy.ok) {
        throw AppError.fromCatalog('VALIDATION_ERROR', 'Revisa los campos indicados.', {
          fieldErrors: { password: [policy.message] },
        });
      }

      const passwordHash = await hasher.hash(password);
      try {
        const userId = await users.insertUser(email, displayName, passwordHash, clock.now());
        return { userId };
      } catch (error) {
        if (isUniqueEmailViolation(error)) {
          throw AppError.fromCatalog('EMAIL_TAKEN', 'Ese correo ya tiene una cuenta.', {
            fieldErrors: { email: ['Ese correo ya tiene una cuenta.'] },
          });
        }
        throw error;
      }
    },
  };
}
