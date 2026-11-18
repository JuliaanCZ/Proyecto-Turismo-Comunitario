# Cinco afirmaciones del diagrama para el revisor (B3.1)

**Revisor:** Dilan Calvache (Integrante 1, en reemplazo del Integrante 2) · **Autor:** Integrante 4 · **Base:** `main` en `4ac9c4f` (B2.2 integrado)

Cada afirmación del diagrama de [`arquitectura.md`](../../arquitectura.md) se apoya en líneas concretas del código. El autor ejecutó las comprobaciones y anotó lo observado; el revisor las repitió con su propia lectura del código. Las cinco quedaron **confirmadas** en la revisión del PR #23, de modo que se cumple el criterio de cierre de B3.1 («el revisor confirmó cinco afirmaciones»).

| # | Afirmación | Referencias | Observado por el autor | Confirmación del revisor |
|---|---|---|---|---|
| 1 | Express y Socket.IO comparten un único `http.Server` y un único puerto | `src/server.js:11-12`, `server.js:12` y `server.js:27` | Un solo `listen` y un solo `createServer` | **Confirmada** |
| 2 | El orden de middlewares de Express protege cada ruta antes de llegar a un router | `src/app.js:66-102` | Orden confirmado leyendo el archivo | **Confirmada** |
| 3 | Solo `src/shared/db.js` abre SQLite; el SQL vive solo en `modules/*/data` | `src/shared/db.js:1`, `eslint.config.js:7-10` y `eslint.config.js:50-54` | Un único importador en `src`; sin `prepare()` fuera de `data` | **Confirmada** |
| 4 | El WebSocket autentica en el handshake con `Origin` y cookie, revalida en cada evento y se cierra al revocarse la sesión | `src/realtime/gateway.js:82-109`, `src/realtime/session-guard.js:36-62`, `src/realtime/gateway.js:113-120`, `src/modules/accounts/service/sessions.js:62` y `:73`, `src/modules/accounts/service/password-reset.js:78` | Coincide; `realtime` no importa `modules` | **Confirmada** |
| 5 | El contacto por WhatsApp es solo un enlace externo: el servidor arma la URL y no llama a WhatsApp | `src/web/offers.routes.js:41-46` y `:141`, `src/web/views/offers/publica-detalle.ejs:9-10`, `src/config.js:72-75` | `wa.me` aparece una sola vez en `src` y no hay `fetch` ni cliente HTTP | **Confirmada** |

## Cómo comprobar cada una

Desde la raíz del repositorio.

### 1. Un solo `http.Server`

```bash
sed -n 9,19p src/server.js      # createServer(app) y new Server(httpServer, ...)
sed -n 10,13p server.js         # createHttpServer(createApp(container), container)
grep -rn "\.listen(" server.js src      # debe dar una sola línea: server.js:27
grep -rn "createServer(" src            # debe dar una sola línea: src/server.js:11
```

Qué debe verse: Socket.IO se construye con el mismo `httpServer` que recibe `app`; ningún otro archivo de `src` escucha en un puerto.

### 2. Orden de middlewares

```bash
sed -n 66,102p src/app.js
```

Qué debe verse, en este orden: `helmet` (66) → `/salud` y `/favicon.ico` (68-69) → estáticos `/js/shared`, `/js`, `/css` (72-74) → `noStore` en `/panel` y `/api` (78) → `renderPage` (79) → `originGuard` (80) → cuerpos `urlencoded` y `json` de 16 kB (81-82) → `attachPrincipal` (83-86) → `noStoreWithSession` (88) → `pageLocals` (90) → `csrf` (91) → `requireAuth` en `/panel` y `/api` (93) → routers (95-99) → `notFoundHandler` y `errorHandler` (101-102). `createDesignRouter` solo se monta si `appEnv` no es `production` (99). El diagrama resume este orden en una sola caja; omite `renderPage`, `noStoreWithSession` y `pageLocals` y lo dice con «principales».

### 3. SQLite solo en `db.js`, SQL solo en `data`

```bash
grep -rln "node:sqlite" src                                  # solo src/shared/db.js
bash docs/mvp/evidencias/B3.1/comprobar-dependencias.sh      # regla 5 y regla 6
```

Qué debe verse: el único importador de `node:sqlite` en `src` es `src/shared/db.js`; los servicios abren transacciones con `withTransaction` pero no preparan sentencias. Límite honesto: la regla de ESLint solo cubre `src`; `scripts/check-sqlite-argon2.js` también importa `node:sqlite`, y `scripts/perf-seed.js` y `scripts/perf-catalog.js` importan archivos internos de módulos.

### 4. WebSocket autenticado en el mismo servidor

```bash
sed -n 82,109p src/realtime/gateway.js       # Origin (84), cookie (89), resolveSession (95)
sed -n 113,120p src/realtime/gateway.js      # oyente de 'session-revoked'
grep -rn "session-revoked" src               # tres emisores en accounts, un oyente en gateway
sed -n 36,62p src/realtime/session-guard.js  # guard: vuelve a resolver la sesión en cada evento
```

Qué debe verse: el handshake rechaza `Origin` distinto de `APP_ORIGIN` y cookie ausente o inválida antes de dejar conectar; cada evento entrante pasa por `guard`, que vuelve a llamar a `accounts.resolveSession`; al revocar una sesión, `accounts` emite `session-revoked` y el gateway desconecta las salas `session:*` o `user:*`. En el diagrama, la flecha punteada del gateway hacia el contenedor representa esa suscripción a `sessionEvents`.

### 5. WhatsApp como enlace externo

```bash
sed -n 41,46p src/web/offers.routes.js                         # whatsappLink: arma https://wa.me/<numero>?text=...
sed -n 8,10p src/web/views/offers/publica-detalle.ejs          # <a href="<%= whatsappUrl %>"> o aviso si no hay número
sed -n 72,75p src/config.js                                    # WHATSAPP_BOOKING_NUMBER: 8 a 15 dígitos
grep -rn "wa\.me" src public scripts                           # una sola aparición: src/web/offers.routes.js:45
grep -rnE "fetch\(|https?\.request|axios" src                  # sin resultados
```

Qué debe verse: la URL se construye en el servidor y se entrega como enlace; el navegador es quien abre WhatsApp. No hay tabla de reservas ni llamada saliente a WhatsApp.

## Registro de la revisión

Revisión hecha con el código de la rama `bloque/B3.1-arquitectura` (`9d14a54`). El código es el mismo que en `main` después del PR #23 (`a887e67`).

| # | Confirmada | Observaciones |
|---|---|---|
| 1 | ☑ | `src/server.js:11` es el único `createServer` y `server.js:27` el único `listen`. `new Server(httpServer)` usa el mismo servidor que recibe `app` (`src/server.js:12`) |
| 2 | ☑ | En `src/app.js:66-102`, `helmet`, los estáticos, `noStore`, `originGuard`, los cuerpos de 16 kB, `attachPrincipal`, `csrf` y `requireAuth` van antes de los routers (95-99). `notFoundHandler` y `errorHandler` cierran la cadena |
| 3 | ☑ | `node:sqlite` solo aparece en `src/shared/db.js:1`. ESLint lo prohíbe en el resto de `src` (`eslint.config.js:7-10` y `50-54`) y rechazó una importación de prueba en `modules/offers/data` |
| 4 | ☑ | El handshake rechaza otro `Origin` (`gateway.js:84`) y la cookie ausente o inválida (89-98). `guard` vuelve a llamar a `resolveSession` en cada evento (`session-guard.js:47`). `session-revoked` se emite en `sessions.js:62` y `:73` y en `password-reset.js:78`, y el gateway lo escucha (`gateway.js:113-120`) |
| 5 | ☑ | `wa.me` aparece una sola vez (`offers.routes.js:45`). La vista lo imprime como enlace (`publica-detalle.ejs:9`) o muestra el aviso si no hay número (línea 10). No hay `fetch` ni cliente HTTP en `src`; los dos `fetch` de `public/js` llaman al propio servidor |

Comandos repetidos por el revisor: `comprobar-rutas.sh` (110 elementos, 0 faltan), `contrastar-esquema.mjs` (295 comprobaciones, 0 fallos), `npm test` (202 de 202) y `npm run lint` (sin errores). En Windows, `comprobar-dependencias.sh` desde Git Bash no puede ejecutar `npm` ni `npx`; las reglas 1 a 10 por `grep` pasaron, y los cinco controles negativos de ESLint se repitieron desde PowerShell con el mismo resultado.

Revisor: Dilan Calvache (en reemplazo del Integrante 2) · Fecha: 2026-11-17
