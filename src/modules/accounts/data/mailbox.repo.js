export function createMailboxRepo(db) {
  return {
    async insertMail({ toEmail, subject, body, createdAt }) {
      await db.query('INSERT INTO mail_outbox (to_email, subject, body, created_at) VALUES ($1,$2,$3,$4)',
        [toEmail, subject, body, createdAt]);
    },
    async listRecent(limit) {
      const result = await db.query('SELECT * FROM mail_outbox ORDER BY id DESC LIMIT $1', [limit]);
      return result.rows;
    },
  };
}
