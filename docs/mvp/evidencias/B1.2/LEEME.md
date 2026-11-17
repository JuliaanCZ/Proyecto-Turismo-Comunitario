# Evidencias B1.2 — Ingreso, sesión, cierre y rutas protegidas

| Archivo | Qué evidencia |
|---|---|
| `set-cookie-cabeceras.txt` | Cabecera `Set-Cookie` real (con el token redactado): `tc_session` con `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=28800`; y `__Host-tc_session` + `Secure` con `COOKIE_SECURE=true`. Confirma `sessions.token_hash === sha256(token)`. |
| `ingreso-escritorio.png` | Vista `/ingreso?aviso=cuenta-creada` en navegador con el aviso permitido y el formulario. |
| `panel-con-sesion.png` | Vista `/panel` alcanzada tras ingresar con sesión real (`Hola, Ana Quispe`, resumen real de `offers` y botón `Salir` con CSRF). En el navegador `document.cookie === ""` (confirma `HttpOnly`). |
| `pruebas-bloque.txt` | Salida de `node --test tests/integration/cuentas-sesion.test.js` (`TM-CTA-06` a `TM-CTA-12` + cruce con `createSessionFor` de B0.5). |
| `npm-test.txt` · `npm-lint.txt` | Suite completa integrada y `eslint .` sin errores. |
