const MESSAGE_COLUMNS = `id, author_id, author_name, text, client_message_id, created_at`;

export function createMessagesRepo(db) {
  const insert = db.prepare(`
    INSERT INTO chat_messages (
      room, author_id, author_name, text, client_message_id, created_at
    ) VALUES ('general', ?, ?, ?, ?, ?)
    ON CONFLICT(author_id, client_message_id) DO NOTHING
  `);
  const byClientId = db.prepare(`
    SELECT ${MESSAGE_COLUMNS}
    FROM chat_messages
    WHERE author_id = ? AND client_message_id = ?
  `);
  const before = db.prepare(`
    SELECT ${MESSAGE_COLUMNS}
    FROM chat_messages
    WHERE room = 'general' AND id < ?
    ORDER BY id DESC
    LIMIT ?
  `);
  const after = db.prepare(`
    SELECT ${MESSAGE_COLUMNS}
    FROM chat_messages
    WHERE room = 'general' AND id > ?
    ORDER BY id ASC
    LIMIT ?
  `);
  const last = db.prepare(`
    SELECT COALESCE(MAX(id), 0) AS id
    FROM chat_messages
    WHERE room = 'general'
  `);

  return {
    insertOrGet(authorId, authorName, clientMessageId, text, now) {
      const result = insert.run(authorId, authorName, text, clientMessageId, now);
      return {
        row: byClientId.get(authorId, clientMessageId),
        duplicated: result.changes === 0,
      };
    },
    listBefore(id, limit) {
      return before.all(id, limit);
    },
    listAfter(id, limit) {
      return after.all(id, limit);
    },
    lastId() {
      return Number(last.get().id);
    },
  };
}
