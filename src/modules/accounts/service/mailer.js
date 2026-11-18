import { createMailboxRepo } from '../data/mailbox.repo.js';

const LINK_RE = /https?:\/\/\S+/;

/**
 * Envío simulado (DM-15): escribe en `mail_outbox`, sin SMTP. El contenido nunca se registra en consola.
 * `listMailbox` alimenta la bandeja de pruebas.
 */
export function createMailer({ db, clock }) {
  const mailbox = createMailboxRepo(db);
  return {
    send({ to, subject, body }) {
      mailbox.insertMail({ toEmail: to, subject, body, createdAt: clock.now() });
    },
    listMailbox(limit = 20) {
      return mailbox.listRecent(limit).map((row) => ({
        id: row.id,
        toEmail: row.to_email,
        subject: row.subject,
        link: LINK_RE.exec(row.body)?.[0] ?? null,
        createdAt: row.created_at,
      }));
    },
  };
}
