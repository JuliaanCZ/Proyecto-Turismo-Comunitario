# Evidencias de B1.10 — Aviso de nuevo mensaje en el panel

Fecha: 2026-11-17 · Windows · Node v24.22.3 · Chrome 157 (headless, dos perfiles).

**Estado tras integrar `origin/main` (B1.2 ingreso y B1.5 ofertas) sobre 42fa415 y corregir el contador heredado entre cuentas:** `npm test` 151/151, `npm run lint` sin errores, las pruebas de B1.10 pasan (8 + 16, ver tabla) y los recorridos con **registro e ingreso reales** pasan completos (apartados siguientes). Los cambios de código de la corrección aún no están en un commit.

## Dos comprobaciones distintas (no mezclar)

| | A. Sesiones **simuladas** (anterior a B1.2) | B. Ingreso **real** (posterior a la integración) |
|---|---|---|
| Servidor | `scripts/demo-aviso-chat.js`, base en memoria | `node server.js` real, base SQLite temporal |
| Cuentas | ana y luis ficticios, cookie fijada por `/simulacion/sesion` | Ana Real y Luis Real creados en `/registro` y con `/ingreso` (Argon2, sesión real) |
| Chat / aviso / insignia | reales | reales |
| Evidencia | `navegador-insignia.txt` y capturas `00`–`06` | `navegador-ingreso-real.txt` y capturas `real-00`–`real-08` |
| Script | `comprobar-navegador.mjs.txt` | `navegador-cuentas.txt` / `navegador-cuentas-antes-del-arreglo.txt` | **C**: contador entre cuentas en una misma pestaña, con el arreglo (34 pasan) y con el código anterior (7 fallan) |
| `cuentas-01`…`cuentas-04` (`.png`) | Luis con 2 avisos; Ana en la misma pestaña sin el contador de Luis; Ana con su propio «1 mensaje nuevo»; almacenamiento heredado sin dueño descartado |
| `comprobar-navegador-cuentas.mjs.txt` | Script de C |
| `comprobar-navegador-real.mjs.txt` |

Las evidencias A **se conservan sin cambios** como historial; la B es la que cierra el criterio «dos navegadores con ingreso real».

**C. Contador por cuenta (misma pestaña, ingreso real).** Comprueba que `chatNuevos` no pasa de una cuenta a otra: Luis recibe 2 avisos, sale y Ana ingresa en la misma pestaña (`navegador-cuentas.txt`, 34 comprobaciones, capturas `cuentas-01`–`cuentas-04`). `navegador-cuentas-antes-del-arreglo.txt` es el mismo recorrido con el código anterior: 7 comprobaciones fallan (Ana ve «2 mensajes nuevos» de Luis, y un `chatNuevos` sin dueño se muestra tal cual). Script: `comprobar-navegador-cuentas.mjs.txt`.

## Qué hay aquí

| Archivo | Contenido |
|---|---|
| `aviso-mensaje.txt` | `node --test tests/ws/aviso-mensaje.test.js`: 8 pruebas, 8 pasan (TM-NOT-01 a TM-NOT-04 y 4 extra). Repetido tras la integración |
| `aviso-panel-y-demo.txt` | `node --test tests/integration/aviso-panel.test.js tests/integration/demo-aviso-chat.test.js tests/unit/notificaciones-contador.test.js`: 16 pruebas, 16 pasan (carga del script y `data-user-id` sin token, CSP, demostración y **regresión del contador por cuenta**: 7 pruebas unitarias nuevas más 1 de integración) |
| `npm-test.txt` | `npm test` con la integración y la corrección: **151 pruebas, 151 pasan** (integrado sin la corrección: 143 de 143; antes de integrar: 127 de 127) |
| `npm-lint.txt` | `npm run lint` tras la integración: código de salida 0 |
| `navegador-insignia.txt` | **A (sesiones simuladas)**: recorrido en dos Chrome reales, 21 comprobaciones, todas pasan |
| `navegador-ingreso-real.txt` | **B (ingreso real)**: registro e ingreso por los formularios, dos Chrome con perfiles separados, chat real: 44 comprobaciones, todas pasan (incluye «Mis ofertas» de B1.5, respuesta en sentido contrario y «Salir») |
| `00-luis-panel-antes.png` | Luis en `/panel` antes del mensaje: sin insignia |
| `01-luis-insignia-1-mensaje-nuevo.png` | **«1 mensaje nuevo» sin recargar** (el script comprueba que la marca de la página sigue viva y que el foco no se movió) |
| `02-ana-autora-en-el-chat.png`, `03-ana-autora-otra-pestana-sin-insignia.png` | Ana (autora) en el chat y en su otra pestaña del panel: sin insignia |
| `04-luis-insignia-2-mensajes-nuevos.png` | «2 mensajes nuevos» (plural) |
| `05-luis-en-el-chat-recibe-mensaje.png`, `06-luis-panel-insignia-limpia.png` | En la sala recibe `chat:message` y no acumula avisos; al volver a `/panel` la insignia está vacía |
| `real-00`…`real-08` (`.png`) | Capturas de B: Luis antes y con «1 mensaje nuevo», Ana autora sin insignia, «2 mensajes nuevos», insignia en «Mis ofertas», chat en vivo, insignia limpia y aviso a Ana cuando responde Luis |
| `comprobar-navegador-real.mjs.txt` | Script de B (contraseñas aleatorias que no se imprimen; de las cookies solo se muestran atributos y una huella de 8 caracteres) |
| `comprobar-navegador.mjs.txt` | Script de A (se guarda como `.txt` para que ESLint no lo analice; se ejecuta renombrándolo a `.mjs`) |

**Las capturas `00`–`06` (A) usan sesiones simuladas** (ana y luis son ficticios, base en memoria). **Las capturas `real-*` (B) usan cuentas creadas con el registro real y sesión iniciada con `/ingreso`.** En ambas el chat, el gateway, el aviso y la insignia son los reales.

## Pendiente

Comprobado ya (B): recorrido con ingreso real en dos navegadores con cookies separadas, sin recargar, autor sin insignia, insignia que sobrevive a «Mis ofertas» y al catálogo, y borrado al abrir el chat. **Queda sin comprobar:**

- **Lector de pantalla real.** Se comprobó el marcado (`aria-live="polite"`, `aria-atomic="true"`, región siempre presente en el árbol de accesibilidad), el foco y el texto; falta una prueba manual con NVDA o similar (T-A11Y-04).
- **Prueba hecha por una persona.** El recorrido B lo conduce un script por el protocolo DevTools en Chrome headless; no se hizo una pasada manual con ventanas visibles.
- **Otros navegadores y HTTPS.** Solo Chrome 157, sobre `http://localhost` con `COOKIE_SECURE=false`. Sin probar Firefox/Safari, ni la cookie `Secure` ni el despliegue detrás de Caddy.
- **Contador entre cuentas: corregido y comprobado** (apartado C). Queda sin probar el caso de otra pestaña distinta con otra cuenta (no comparte `sessionStorage`, por diseño) y un cambio de cuenta con una página anterior aún abierta en caché de «Atrás»: está cubierto solo por la prueba unitaria (una página de Luis no lee el contador de Ana), no por el navegador.
- **Aviso por usuario vs. por socket** sigue «por fijar» (ver decisiones de diseño).
- **B1.5:** la integración con sus pantallas funciona con la insignia (comprobado en `/panel/ofertas` y `/ofertas`), pero la revisión de las pantallas de ofertas en sí no es objeto de este bloque.

## Cómo reproducir la demostración

Necesita Chrome (u otro navegador) dos veces con cookies separadas: dos navegadores distintos, o un perfil normal y una ventana privada. **Deben usar `http://localhost:3100`** (no `127.0.0.1`): el gateway exige que el `Origin` sea igual a `APP_ORIGIN`.

```bash
node scripts/demo-aviso-chat.js            # terminal 1; puerto 3100 (--puerto=NNNN para cambiarlo)
```

1. Navegador A: abre `http://localhost:3100/simulacion/sesion?usuario=ana` y ve a **Chat** (`/panel/chat`).
2. Navegador B: abre `http://localhost:3100/simulacion/sesion?usuario=luis`; se queda en **/panel**.
3. En A escribe un mensaje y envíalo. En B aparece «1 mensaje nuevo» junto a «Chat» sin recargar; en A no aparece nada.
4. Envía otro: «2 mensajes nuevos». Navega en B a `/`: la insignia se conserva. Entra en **Chat**: se borra.

Para repetir las capturas y las 21 comprobaciones automáticamente (con el servidor del paso anterior arrancado):

```bash
cp docs/mvp/evidencias/B1.10/comprobar-navegador.mjs.txt /tmp/comprobar-navegador.mjs
node /tmp/comprobar-navegador.mjs docs/mvp/evidencias/B1.10 http://localhost:3100
```

(Si Chrome no está en la ruta habitual de Windows, define la variable `CHROME`.)

## Cómo reproducir el recorrido con ingreso real (B)

Necesita Chrome y un servidor real con base temporal (no usa la herramienta de demostración). Los correos son ficticios y las contraseñas se generan al azar en cada ejecución.

```bash
PORT=3200 APP_ORIGIN=http://localhost:3200 DATABASE_FILE=/ruta/temporal/real.sqlite node server.js   # terminal 1
cp docs/mvp/evidencias/B1.10/comprobar-navegador-real.mjs.txt /ruta/temporal/comprobar-real.mjs
node /ruta/temporal/comprobar-real.mjs docs/mvp/evidencias/B1.10 http://localhost:3200              # terminal 2
```

Usa una base nueva en cada ejecución: la comprobación espera exactamente los mensajes que ella misma envía.

## Aislamiento de la herramienta de demostración

`scripts/demo-aviso-chat.js` no la importa `server.js` ni `src/**`, se niega a arrancar con `APP_ENV=production`, escucha solo en `127.0.0.1`, usa una base en memoria y genera un token aleatorio por usuario en cada arranque. Los tokens y las cookies nunca se imprimen: la ruta `GET /simulacion/sesion?usuario=...` (solo existe en la herramienta, exige `GET` y `Host` de loopback) responde 302 a `/panel` con `Set-Cookie` (`HttpOnly`, `SameSite=Lax`). Cubierto por `tests/integration/demo-aviso-chat.test.js`.

## Decisiones de diseño

- **Un aviso por socket, no por usuario.** Si Luis tiene dos pestañas fuera de la sala, cada una recibe el aviso y cuenta por su cuenta (`sessionStorage` es por pestaña). Coincide con `docs/planificacion/05` §5 y T-CHAT-10c («por fijar» si debe agregarse por usuario).
- **La insignia es la región `aria-live`** y no se oculta con `hidden`/`display: none` (un lector de pantalla no anuncia cambios dentro de un elemento fuera del árbol de accesibilidad). Sin avisos queda vacía y recortada con `.sr-only`; con avisos muestra el texto. `header.ejs` y `app.css` no cambian; `notificaciones.js` fija los atributos al cargar.
- **El contador pertenece a la cuenta.** `chatNuevos` sigue siendo un entero en `sessionStorage` (compatible con `chat.js`). El dueño se guarda en `chatNuevosUsuario` con el **id numérico del usuario**, que `layout.ejs` imprime en `data-user-id` del `<script>` del aviso (el mismo dato que ya imprime la sala del chat; nunca el token ni el id de sesión, comprobado en `aviso-panel.test.js`). Si el dueño no coincide, o no existe (almacenamiento de la versión anterior), el contador se descarta y la cuenta actual lo reclama. Lógica en `public/js/notificaciones-contador.js`; `header.ejs`, `chat.js` y `app.css` no cambian. No se limpia al salir porque `/ingreso` no carga el script: lo decide el dueño al cargar la siguiente pantalla con sesión.
- **`chat.js` ya borra `chatNuevos` al cargar** (`public/js/chat.js:23`); este bloque no lo modifica. En `/panel/chat` no se carga `notificaciones.js`, de modo que leer en vivo nunca suma avisos.
- **`registerNotifications(gateway, { logger })`**: el segundo parámetro es opcional y solo sirve para registrar un fallo de emisión; un error en el aviso no afecta a la confirmación del mensaje ni a otros oyentes de `onMessageStored`.
