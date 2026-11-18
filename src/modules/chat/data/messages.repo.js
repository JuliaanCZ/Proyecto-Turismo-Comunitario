const COLUMNS = 'id, author_id, author_name, text, client_message_id, created_at';

export function createMessagesRepo(db) {
  return {
    async insertOrGet(authorId, authorName, clientMessageId, text, now) {
      const inserted = await db.query(`INSERT INTO chat_messages
        (room, author_id, author_name, text, client_message_id, created_at)
        VALUES ('general',$1,$2,$3,$4,$5)
        ON CONFLICT (author_id, client_message_id) DO NOTHING RETURNING ${COLUMNS}`,
      [authorId, authorName, text, clientMessageId, now]);
      if (inserted.rows[0]) return { row: inserted.rows[0], duplicated: false };
      const existing = await db.query(`SELECT ${COLUMNS} FROM chat_messages
        WHERE author_id = $1 AND client_message_id = $2`, [authorId, clientMessageId]);
      return { row: existing.rows[0], duplicated: true };
    },
    async listBefore(id, limit) {
      return (await db.query(`SELECT ${COLUMNS} FROM chat_messages
        WHERE room = 'general' AND id < $1 ORDER BY id DESC LIMIT $2`, [id, limit])).rows;
    },
    async listAfter(id, limit) {
      return (await db.query(`SELECT ${COLUMNS} FROM chat_messages
        WHERE room = 'general' AND id > $1 ORDER BY id ASC LIMIT $2`, [id, limit])).rows;
    },
    async lastId() {
      const result = await db.query("SELECT COALESCE(MAX(id),0) AS id FROM chat_messages WHERE room = 'general'");
      return Number(result.rows[0].id);
    },
  };
}
