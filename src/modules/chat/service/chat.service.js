import { AppError } from '../../../shared/errors.js';
import { validate } from '../../../shared/validation/validate.js';
import { createMessagesRepo } from '../data/messages.repo.js';
import { chatMessageSchema } from '../domain/schemas.js';

function validationError(fieldErrors) {
  throw AppError.fromCatalog('VALIDATION_ERROR', 'Revisa los datos del mensaje.', { fieldErrors });
}

function userId(principal) {
  if (!Number.isSafeInteger(principal?.userId) || principal.userId < 1) {
    throw AppError.fromCatalog('UNAUTHENTICATED', 'Debes iniciar sesión para continuar.');
  }
  return principal.userId;
}

function normalizeInput(input) {
  const errors = {};
  if (typeof input?.clientMessageId !== 'string') {
    errors.clientMessageId = ['El identificador del mensaje debe ser un UUID válido.'];
  }
  if (typeof input?.text !== 'string') {
    errors.text = ['El mensaje debe ser texto.'];
  }
  if (Object.keys(errors).length) validationError(errors);

  const normalized = {
    clientMessageId: input.clientMessageId.trim().toLowerCase(),
    text: input.text.normalize('NFC').trim(),
  };
  const result = validate(chatMessageSchema, normalized);
  if (!result.ok) validationError(result.errors);
  return result.values;
}

function messageDto(row) {
  return {
    id: Number(row.id),
    author: {
      id: Number(row.author_id),
      displayName: row.author_name,
    },
    text: row.text,
    createdAt: Number(row.created_at),
    clientMessageId: row.client_message_id,
  };
}

function parseInteger(value, field, { min }) {
  const raw = typeof value === 'number' ? String(value) : value;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    validationError({ [field]: [`${field} debe ser un número entero.`] });
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < min) {
    validationError({ [field]: [`${field} debe ser un número entero desde ${min}.`] });
  }
  return parsed;
}

export function createChatService({ db, clock }) {
  const repo = createMessagesRepo(db);

  return {
    async postMessage(principal, input) {
      const authorId = userId(principal);
      const values = normalizeInput(input);
      const stored = await repo.insertOrGet(
        authorId,
        principal.displayName,
        values.clientMessageId,
        values.text,
        clock.now(),
      );
      return { message: messageDto(stored.row), duplicated: stored.duplicated };
    },

    async getHistory(query = {}) {
      const hasBefore = Object.hasOwn(query, 'before') && query.before !== undefined;
      const hasAfter = Object.hasOwn(query, 'after') && query.after !== undefined;
      if (hasBefore && hasAfter) {
        validationError({ cursor: ['Usa before o after, pero no ambos.'] });
      }
      const limit = query.limit === undefined
        ? (hasAfter ? 100 : 30)
        : parseInteger(query.limit, 'limit', { min: 1 });
      if (limit > 100) validationError({ limit: ['limit debe estar entre 1 y 100.'] });

      let rows;
      if (hasAfter) {
        const after = parseInteger(query.after, 'after', { min: 0 });
        rows = await repo.listAfter(after, limit + 1);
        const hasMore = rows.length > limit;
        return { messages: rows.slice(0, limit).map(messageDto), hasMore };
      }

      const before = hasBefore
        ? parseInteger(query.before, 'before', { min: 1 })
        : (await repo.lastId()) + 1;
      rows = await repo.listBefore(before, limit + 1);
      const hasMore = rows.length > limit;
      return {
        messages: rows.slice(0, limit).reverse().map(messageDto),
        hasMore,
      };
    },

    async lastMessageId() {
      return repo.lastId();
    },
  };
}
