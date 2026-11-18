export function createMailboxRepo(db) {
  const insert = db.prepare(`
    INSERT INTO mail_outbox (to_email, subject, body, created_at) VALUES (?, ?, ?, ?)
  `);
  const recent = db.prepare(`
    SELECT id, to_email, subject, body, created_at
    FROM mail_outbox ORDER BY id DESC LIMIT ?
  `);

  return {
    insertMail({ toEmail, subject, body, createdAt }) {
      insert.run(toEmail, subject, body, createdAt);
    },
    listRecent(limit) {
      return recent.all(limit);
    },
  };
}
