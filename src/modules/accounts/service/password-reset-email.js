const ESCAPED_HTML = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ESCAPED_HTML[character]);
}

export function passwordResetEmail({ displayName, link, expiresInMinutes }) {
  const greeting = `Hola, ${displayName}.`;
  const instructions = 'Recibimos una solicitud para cambiar la contraseña de tu cuenta en Kawsay Ñan.';
  const expiry = `El enlace vence en ${expiresInMinutes} minutos y solo se puede usar una vez.`;
  const unsolicited = 'Si no solicitaste el cambio, puedes ignorar este correo.';
  const href = escapeHtml(link);

  return {
    subject: 'Restablece tu contraseña | Kawsay Ñan',
    body: `Kawsay Ñan\n\n${greeting}\n\n${instructions}\n\nRestablece tu contraseña:\n${link}\n\n${expiry}\n\n${unsolicited}`,
    html: `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Restablece tu contraseña | Kawsay Ñan</title>
</head>
<body style="margin:0;background-color:#f3f0eb;color:#2d2d2d;font-family:Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f0eb">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border:1px solid #dedad4;border-radius:16px">
        <tr><td style="padding:24px 28px;border-top:5px solid #fa8c2d;border-bottom:1px solid #dedad4;border-radius:16px 16px 0 0">
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td width="52"><img src="cid:kawsay-nan-logo" alt="" width="44" height="44" style="display:block;border:0"></td>
              <td style="font:bold 23px Georgia,serif;color:#2d2d2d">Kawsay Ñan</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 20px;font:bold 30px/1.15 Georgia,serif;color:#2d2d2d">Restablece tu contraseña</h1>
          <p style="margin:0 0 12px;font-size:16px;line-height:1.55">${escapeHtml(greeting)}</p>
          <p style="margin:0 0 22px;font-size:16px;line-height:1.55">${instructions}</p>
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr><td bgcolor="#fa8c2d" style="border-radius:8px">
              <a href="${href}" style="display:inline-block;padding:14px 20px;border-radius:8px;color:#2d2d2d;font:bold 16px Arial,sans-serif;text-decoration:none">Restablecer contraseña</a>
            </td></tr>
          </table>
          <p style="margin:18px 0 0;font-size:14px;line-height:1.55;color:#68635e">${expiry}</p>
        </td></tr>
        <tr><td style="padding:20px 28px;border-top:1px solid #dedad4;font-size:14px;line-height:1.55;color:#68635e">${unsolicited}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}
