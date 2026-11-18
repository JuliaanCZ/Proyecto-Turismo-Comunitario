import { Router } from 'express';

function viewMessage(message) {
  const date = new Date(message.createdAt);
  return {
    ...message,
    createdAtIso: date.toISOString(),
    createdAtLabel: new Intl.DateTimeFormat('es-EC', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Guayaquil',
    }).format(date),
  };
}

export function createChatRouter(container) {
  const router = Router();

  router.get('/panel/chat', async (req, res, next) => {
    try {
      const history = await container.chat.getHistory({ limit: 30 });
      const messages = history.messages.map(viewMessage);
      res.renderPage('chat/sala', {
        title: 'Chat',
        messages,
        hasMore: history.hasMore,
        firstMessageId: messages[0]?.id ?? 0,
        lastMessageId: messages.at(-1)?.id ?? 0,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/chat/mensajes', async (req, res, next) => {
    try {
      res.json(await container.chat.getHistory(req.query));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
