# Evidencias B1.3 — Recuperación de clave con token de un solo uso

| Archivo | Qué evidencia |
|---|---|
| `bandeja-con-enlace.png` | `/dev/bandeja` abierta con la clave de la demo tras pedir el enlace desde `/recuperar`: destinatario, asunto, fecha y el enlace a `/restablecer` (el token no se ve en la captura). |
| `pruebas-bloque.txt` | Salida de `node --test tests/integration/cuentas-recuperacion.test.js` (`TM-CTA-13` a `TM-CTA-19` y la prueba de `Origin: null` en `/restablecer`). |
| `npm-test.txt` · `npm-lint.txt` | Suite completa y `eslint .` sobre la rama creada desde `main` actualizado. |

**Recorrido manual en navegador (servidor local con base temporal).** Registro de una cuenta ficticia, solicitud en `/recuperar` (aviso «Si el correo tiene una cuenta…»), bandeja con autenticación básica y apertura del enlace: `/restablecer` muestra el formulario sin consumir el token. El envío de la contraseña nueva se comprobó con las pruebas HTTP, no en el navegador.

**Decisión: `Origin: null` en `POST /restablecer`.** El plan pide `Referrer-Policy: no-referrer` en `/restablecer`; con esa política el navegador envía el formulario con `Origin: null` y la protección de origen (C-HTTP) lo rechazaría. `originGuard` acepta `null` solo en esa ruta, que exige además un token secreto de un solo uso; el resto de rutas sigue igual (lo cubre la prueba). Por lo mismo, el restablecimiento no envía `Set-Cookie`: las sesiones quedan revocadas en la base.
