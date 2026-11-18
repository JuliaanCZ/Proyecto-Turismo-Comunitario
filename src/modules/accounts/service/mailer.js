import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { createMailboxRepo } from '../data/mailbox.repo.js';

const LINK_RE = /https?:\/\/\S+/;
const RESEND_TIMEOUT_MS = 5_000;

function createResendMailer({ apiKey, fromEmail }, logger) {
  const logo = readFileSync(new URL('./kawsay-nan-logo.png', import.meta.url), 'base64');
  return {
    async send({ to, subject, body, html }) {
      try {
        const response = await globalThis.fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          redirect: 'error',
          signal: globalThis.AbortSignal.timeout(RESEND_TIMEOUT_MS),
          body: JSON.stringify({
            from: `Kawsay Ñan <${fromEmail}>`,
            to: [to],
            subject,
            text: body,
            html,
            attachments: [{ filename: 'kawsay-nan-logo.png', content: logo, content_id: 'kawsay-nan-logo' }],
          }),
        });
        await response.body?.cancel();
        if (!response.ok) logger.error(`Resend rechazó el correo de recuperación (HTTP ${response.status}).`);
      } catch {
        logger.error('No se pudo completar el envío del correo de recuperación por Resend.');
      }
    },
  };
}

export function createMailer({ db, clock, config, logger }) {
  if (config.resend) return createResendMailer(config.resend, logger);

  const mailbox = createMailboxRepo(db);
  return {
    async send({ to, subject, body }) {
      await mailbox.insertMail({ toEmail: to, subject, body, createdAt: clock.now() });
    },
    async listMailbox(limit = 20) {
      return (await mailbox.listRecent(limit)).map((row) => ({
        id: row.id,
        toEmail: row.to_email,
        subject: row.subject,
        link: LINK_RE.exec(row.body)?.[0] ?? null,
        createdAt: row.created_at,
      }));
    },
  };
}
