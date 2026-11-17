import argon2 from 'argon2';

/**
 * Único lugar que hashea o verifica contraseñas (B1.1).
 * Parámetros desde `config` (ARGON2_*).
 */
export function createHasher(config) {
  const options = {
    type: argon2.argon2id,
    memoryCost: config.argon2MemoryKib,
    timeCost: config.argon2TimeCost,
    parallelism: config.argon2Parallelism,
  };

  return {
    async hash(plain) {
      return argon2.hash(plain, options);
    },
    async verify(hash, plain) {
      return argon2.verify(hash, plain);
    },
  };
}
