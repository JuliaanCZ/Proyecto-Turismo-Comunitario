> **Actualización Supabase (noviembre de 2026):** la persistencia vigente usa PostgreSQL y Storage de Supabase. Consulta [la configuración actual](supabase.md). Las referencias a SQLite y sus evidencias en esta página describen la implementación anterior.

# Seguridad del MVP

## Alcance y resultado

Esta matriz reúne los controles exigidos por la guía del primer bimestre y los comprueba contra la aplicación integrada. B2.4 no modifica contratos ni código productivo: añade pruebas cruzadas, evidencia y un guion reproducible. Las cifras y estados se actualizan únicamente con ejecuciones reales.

## Matriz de controles

| Control | Requisito de la guía | Implementación comprobada | Prueba | Demostración en vivo |
|---|---|---|---|---|
| Hash con sal | R5, O4: contraseñas almacenadas de forma segura | `src/modules/accounts/service/hasher.js`; Argon2id con parámetros de entorno | TM-SEG-01 | Mostrar dos hashes distintos para la misma clave sin enseñar la clave |
| Validación en servidor | O3, O4: no depender del JavaScript del navegador | `validate.js`, esquemas de cuentas y ofertas, servicios de ambos módulos | TM-SEG-02 | Enviar datos inválidos y mostrar 422 sin filas nuevas |
| Rutas protegidas | R5, O4: panel y API solo con sesión | `attachPrincipal`, `requireAuth`, rutas `/panel` y `/api` | TM-SEG-03 | Abrir `/panel/chat` en una ventana privada y observar la redirección |
| CSRF | O4: proteger mutaciones | `originGuard` exige origen exacto; `csrf` exige HMAC de sesión | TM-SEG-04 | Intentar una mutación sin token y mostrar 403 sin cambios |
| XSS | O4: salida no ejecutable y JavaScript seguro | EJS usa salida escapada; ESLint prohíbe `innerHTML` en `public/js` | TM-SEG-05 | Abrir una oferta y un mensaje con etiquetas maliciosas; aparecen como texto |
| Inyección SQL | O4: consultas parametrizadas | Repositorios usan sentencias preparadas y valores enlazados | TM-SEG-06 | Probar correo, filtros y campos con SQL; no entra a otra cuenta ni daña tablas |
| WebSocket autenticado | R7, O4: cookie y origen en handshake, cargas validadas | `realtime/gateway.js`, guard por evento y esquema del chat | TM-SEG-07 | Mostrar `connect_error` sin cookie y rechazo de una carga inválida |
| Cookie de sesión | R5, O4: atributos seguros | `tc_session`; con TLS, `__Host-tc_session`; `HttpOnly`, `SameSite=Lax`, `Secure`, `Path=/` | TM-SEG-08 | Enseñar `Set-Cookie` ocultando su valor |
| Secretos fuera del repositorio | O4, O10: configuración por entorno | `.env` ignorado; `.env.example` ficticio y alineado con `src/config.js` | TM-SEG-09 | Mostrar `git check-ignore .env` y las claves ficticias del ejemplo |
| Cabeceras | O4: CSP y protecciones del navegador | Helmet: CSP propia, `nosniff`, `frame-ancestors 'none'`; además emite `X-Frame-Options: SAMEORIGIN` | TM-SEG-10 | Mostrar las cabeceras de `/` en DevTools |

## Riesgos residuales declarados

- No hay límite de intentos de ingreso ni de solicitudes de recuperación (DM-12). No se debe exponer una demo pública sin una protección adicional del proxy.
- El registro devuelve `EMAIL_TAKEN`, por lo que revela si un correo ya fue registrado. La recuperación sí mantiene una respuesta uniforme.
- La sesión tiene vencimiento fijo, pero no cierre por inactividad ni renovación deslizante.
- El chat no limita la frecuencia de mensajes (DM-13); sí limita tamaño, tipo y longitud.
- La bandeja `/dev/bandeja` contiene enlaces de recuperación: debe permanecer desactivada salvo durante la demo y protegida con una clave propia.
- Las pruebas son controles funcionales dirigidos. B2.4 no incluye auditoría externa, análisis automático de dependencias ni prueba de penetración.

## Guion de demostración de seguridad (3 minutos)

| Tiempo | Acción | Resultado visible | Evidencia de respaldo |
|---|---|---|---|
| 0:00–0:25 | Mostrar dos hashes de cuentas ficticias en SQLite | Ambos empiezan por `$argon2id$`, son distintos y no muestran la clave | TM-SEG-01 |
| 0:25–0:50 | Enviar un registro u oferta inválidos | La página responde con errores por campo y no crea filas | TM-SEG-02 |
| 0:50–1:10 | Abrir `/panel/chat` sin sesión; intentar un POST sin CSRF | Redirección a ingreso y 403 sin efecto | TM-SEG-03, TM-SEG-04 |
| 1:10–1:40 | Abrir la oferta y el chat con las cadenas `<img onerror>` y `<script>` | Las etiquetas aparecen como texto; no se abre ningún diálogo | TM-SEG-05 y captura B2.4 |
| 1:40–2:05 | Probar un correo o provincia con `' OR 1=1 --` | No inicia sesión, no muestra filas ajenas y las tablas siguen presentes | TM-SEG-06 |
| 2:05–2:30 | Conectar Socket.IO sin cookie y enviar texto de 600 caracteres con una sesión válida | `UNAUTHENTICATED` y `VALIDATION_ERROR`; no se guarda mensaje | TM-SEG-07 |
| 2:30–2:50 | Mostrar atributos de `Set-Cookie` y cabeceras de `/` | `HttpOnly`, `SameSite=Lax`; en TLS `Secure` y `__Host-`; CSP y `nosniff` | TM-SEG-08, TM-SEG-10 |
| 2:50–3:00 | Cerrar con los riesgos residuales | Se distingue lo comprobado de lo no cubierto | Esta sección |

### Preparación segura

Usar únicamente cuentas y datos ficticios. Si B2.2 ya está integrado, se pueden usar sus cuentas sembradas; de lo contrario se crean dos cuentas con `/registro`. No mostrar contraseñas, tokens, cookies completas ni enlaces de recuperación en capturas o proyección. Antes de la demo ejecutar:

```powershell
node --test "tests/security/*.test.js"
npm.cmd run lint
```
