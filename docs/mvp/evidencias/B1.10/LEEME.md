# Evidencias de B1.10 — Aviso de nuevo mensaje en el panel

Fecha: 2026-11-17 · Windows · Node v24.22.3 · Chrome 157 (headless, dos perfiles).

## Qué hay aquí

| Archivo | Contenido |
|---|---|
| `aviso-mensaje.txt` | `node --test tests/ws/aviso-mensaje.test.js`: 8 pruebas, 8 pasan (TM-NOT-01 a TM-NOT-04 y 4 extra) |
| `aviso-panel-y-demo.txt` | `node --test tests/integration/aviso-panel.test.js tests/integration/demo-aviso-chat.test.js`: 8 pruebas, 8 pasan (carga del script, CSP y herramienta de demostración) |
| `npm-test.txt` | `npm test`: 127 pruebas, 127 pasan (111 de antes + 16 nuevas) |
| `npm-lint.txt` | `npm run lint`: código de salida 0 |
| `navegador-insignia.txt` | Recorrido en dos Chrome reales: 21 comprobaciones, todas pasan |
| `00-luis-panel-antes.png` | Luis en `/panel` antes del mensaje: sin insignia |
| `01-luis-insignia-1-mensaje-nuevo.png` | **«1 mensaje nuevo» sin recargar** (el script comprueba que la marca de la página sigue viva y que el foco no se movió) |
| `02-ana-autora-en-el-chat.png`, `03-ana-autora-otra-pestana-sin-insignia.png` | Ana (autora) en el chat y en su otra pestaña del panel: sin insignia |
| `04-luis-insignia-2-mensajes-nuevos.png` | «2 mensajes nuevos» (plural) |
| `05-luis-en-el-chat-recibe-mensaje.png`, `06-luis-panel-insignia-limpia.png` | En la sala recibe `chat:message` y no acumula avisos; al volver a `/panel` la insignia está vacía |
| `comprobar-navegador.mjs.txt` | Script usado (se guarda como `.txt` para que ESLint no lo analice; se ejecuta renombrándolo a `.mjs`) |

**Las sesiones de las capturas son simuladas** (ana y luis son ficticios, base en memoria). **El chat, el gateway, el aviso y la insignia son los reales.**

## Pendiente

- **Recorrido con ingreso real: pendiente hasta integrar B1.2.** Aún no existe `/ingreso`, así que las dos sesiones salen de la herramienta de demostración. Al integrar B1.2 hay que repetir el criterio de cierre («dos navegadores, el que está en `/panel` ve la insignia sin recargar y el autor no») con cuentas reales, normalmente en B2.2.
- B1.5 (pantallas de ofertas) sigue pendiente de correcciones; el enlace «Mis ofertas» no se verifica aquí.
- Lo que **no** se pudo comprobar: el anuncio real de un lector de pantalla. Se comprobó el marcado (`aria-live="polite"`, `aria-atomic="true"`, región siempre presente en el árbol de accesibilidad), el foco y el texto; falta una prueba manual con NVDA o similar (T-A11Y-04).

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

## Aislamiento de la herramienta de demostración

`scripts/demo-aviso-chat.js` no la importa `server.js` ni `src/**`, se niega a arrancar con `APP_ENV=production`, escucha solo en `127.0.0.1`, usa una base en memoria y genera un token aleatorio por usuario en cada arranque. Los tokens y las cookies nunca se imprimen: la ruta `GET /simulacion/sesion?usuario=...` (solo existe en la herramienta, exige `GET` y `Host` de loopback) responde 302 a `/panel` con `Set-Cookie` (`HttpOnly`, `SameSite=Lax`). Cubierto por `tests/integration/demo-aviso-chat.test.js`.

## Decisiones de diseño

- **Un aviso por socket, no por usuario.** Si Luis tiene dos pestañas fuera de la sala, cada una recibe el aviso y cuenta por su cuenta (`sessionStorage` es por pestaña). Coincide con `docs/planificacion/05` §5 y T-CHAT-10c («por fijar» si debe agregarse por usuario).
- **La insignia es la región `aria-live`** y no se oculta con `hidden`/`display: none` (un lector de pantalla no anuncia cambios dentro de un elemento fuera del árbol de accesibilidad). Sin avisos queda vacía y recortada con `.sr-only`; con avisos muestra el texto. `header.ejs` y `app.css` no cambian; `notificaciones.js` fija los atributos al cargar.
- **`chat.js` ya borra `chatNuevos` al cargar** (`public/js/chat.js:23`); este bloque no lo modifica. En `/panel/chat` no se carga `notificaciones.js`, de modo que leer en vivo nunca suma avisos.
- **`registerNotifications(gateway, { logger })`**: el segundo parámetro es opcional y solo sirve para registrar un fallo de emisión; un error en el aviso no afecta a la confirmación del mensaje ni a otros oyentes de `onMessageStored`.
