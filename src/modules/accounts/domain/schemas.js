/** Esquema C-VAL del registro (B1.1). También alimenta `data-schema` en la vista. */
export const registerSchema = Object.freeze({
  displayName: {
    type: 'string', label: 'nombre', required: true, min: 2, max: 80,
  },
  email: {
    type: 'email', label: 'correo', required: true,
  },
  password: {
    type: 'string', label: 'contraseña', required: true, min: 10, max: 128, preserveExact: true,
  },
  passwordConfirm: {
    type: 'string', label: 'confirmación', required: true, min: 10, max: 128,
    preserveExact: true, equalsField: 'password',
  },
});
