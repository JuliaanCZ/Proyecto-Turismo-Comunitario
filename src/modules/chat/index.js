import { createChatService as createService } from './service/chat.service.js';

export { chatMessageSchema } from './domain/schemas.js';

export function createChatService(deps) {
  return createService(deps);
}
