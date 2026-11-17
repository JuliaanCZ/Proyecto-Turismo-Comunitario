/** Catálogo C-ERR del MVP (§5.1). */
export const ERROR_CATALOG = Object.freeze({
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', status: 422 },
  UNAUTHENTICATED: { code: 'UNAUTHENTICATED', status: 401 },
  NOT_FOUND: { code: 'NOT_FOUND', status: 404 },
  ORIGIN_MISMATCH: { code: 'ORIGIN_MISMATCH', status: 403 },
  CSRF_INVALID: { code: 'CSRF_INVALID', status: 403 },
  EMAIL_TAKEN: { code: 'EMAIL_TAKEN', status: 409 },
  INVALID_CREDENTIALS: { code: 'INVALID_CREDENTIALS', status: 401 },
  TOKEN_INVALID: { code: 'TOKEN_INVALID', status: 400 },
  NOT_IMPLEMENTED: { code: 'NOT_IMPLEMENTED', status: 501 },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500 },
});

export class AppError extends Error {
  /**
   * @param {string} code
   * @param {number} status
   * @param {string} message
   * @param {{ fieldErrors?: Record<string, string[]>, details?: Record<string, unknown> }} [opts]
   */
  constructor(code, status, message, opts = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.fieldErrors = opts.fieldErrors;
    this.details = opts.details;
  }

  /** Construye desde el catálogo; el mensaje por defecto puede sobrescribirse. */
  static fromCatalog(code, message, opts = {}) {
    const entry = ERROR_CATALOG[code];
    if (!entry) {
      throw new Error(`Código de error desconocido: ${code}`);
    }
    return new AppError(entry.code, entry.status, message, opts);
  }
}
