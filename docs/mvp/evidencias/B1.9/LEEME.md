# Evidencias de B1.9 — Panel principal y navegación coherente

Fecha: 2026-11-17 · Windows · Node v24.22.3 · Chrome 157 (headless).

## Qué hay aquí

| Archivo | Contenido |
|---|---|
| `panel-navegacion.txt` | `node --test tests/integration/panel-navegacion.test.js`: 16 pruebas, 16 pasan (TM-NAV-01 a TM-NAV-05, extras y las 3 de `no-store`) |
| `vista-simulada.txt` | `node --test tests/integration/vista-panel-simulada.test.js`: 3 pruebas, 3 pasan (rechazo de producción, cookie por HTTP, token no impreso) |
| `npm-test.txt` | `npm test`: 75 pruebas, 75 pasan |
| `npm-lint.txt` | `npm run lint`: código de salida 0 |
| `check-contraste.txt` | `node scripts/check-contraste.js`: 26 de 26 pares cumplen (se añadió el par de la insignia) |
| `navegador-completo.txt` | Medidas en Chrome con la vista simulada (3 ofertas): menú, h1, título, desborde, controles de 44 px, foco por teclado |
| `navegador-sin-servicio.txt` | Lo mismo con el servicio de ofertas sin implementar (el estado real de `main` hoy) |
| `portada-escritorio.png`, `portada-movil.png` | Portada pública (1280×800 y 375×812) |
| `panel-escritorio.png`, `panel-movil.png` | Panel con sesión simulada y **3 ofertas simuladas** |
| `panel-sin-servicio-escritorio.png`, `panel-sin-servicio-movil.png` | Panel sin servicio de ofertas: aviso y ninguna cifra |
| `404-escritorio.png`, `404-movil.png` | Página 404 con sesión: menú completo y enlace de regreso al panel |
| `foco-saltar-movil.png` | Enlace «Saltar al contenido» con el anillo de foco |
| `comprobar-navegador.mjs.txt` | Script usado para medir y capturar (se guarda como `.txt` para que ESLint no lo analice; se ejecuta renombrándolo a `.mjs`). Ya no recibe token: Chrome abre la sesión visitando `/simulacion/sesion` |

**Las cifras de las capturas del panel son simuladas.** La sesión y el servicio de ofertas son falsos (ver abajo). Ninguna proviene de una base real.

En `navegador-completo.txt` las dos líneas «Failed to load resource … 404 … /panel/no-existe» son esperadas: la comprobación abre a propósito una ruta inexistente para capturar el 404.

## Correcciones tras la revisión

1. **`Cache-Control: no-store`**. `src/app.js` monta `noStore` sobre `/panel` y `/api` desde la entrada (antes de `originGuard`, de los analizadores de cuerpo y de `csrf`), de modo que también lo llevan los rechazos anteriores a `requireAuth` (`ORIGIN_MISMATCH`, JSON mal formado, `CSRF_INVALID`, 401 y la redirección a `/ingreso`). Además, `noStoreWithSession` lo fija en cualquier respuesta a una petición con sesión (por ejemplo `GET /` con el formulario Salir y su token CSRF, o un 404 fuera de `/panel`). La portada pública no lo lleva. Las comprobaciones de origen, sesión y CSRF no cambian. Pruebas nuevas en `panel-navegacion.txt`: portada con sesión, `POST /panel` con sesión y `Origin` correcto pero sin token (403 `CSRF_INVALID` + `no-store`) y los errores previos a `requireAuth`. Comprobado a propósito: sin el cambio en `src/app.js` y `src/shared/http/auth.js`, esas 3 pruebas fallan (13 pasan, 3 fallan); con el cambio pasan las 16.
2. **El token ya no se imprime**. `scripts/vista-panel-simulada.js` no muestra ni el token ni la cookie. El propio servidor de simulación atiende `GET /simulacion/sesion` y responde 302 a `/panel` con `Set-Cookie` (`HttpOnly`, `SameSite=Lax`, `Path=/`, 8 h). Esa ruta existe solo en la herramienta (la atiende antes de entregar la petición a `createApp`; la aplicación real responde 404), exige `GET` y `Host` de loopback, y el script sigue escuchando solo en `127.0.0.1` y negándose con `APP_ENV=production`. Cubierto por `vista-simulada.txt`. Las medidas y capturas de Chrome se repitieron con el script actualizado (modos `completo` y `sin-servicio`, ambos con código de salida 0) y salieron idénticas a las anteriores.

## Cómo ver la vista autenticada mientras no exista el ingreso real

Hasta que B1.2 entregue `/ingreso`, no hay forma legítima de abrir sesión. `scripts/vista-panel-simulada.js` levanta la aplicación real (`createApp`) con una sesión y un servicio de ofertas **falsos**. No es parte de `npm start`, ni de `server.js`, ni de `src/**`; se niega a arrancar con `APP_ENV=production`, escucha solo en `127.0.0.1`, usa una base en memoria y genera un token nuevo en cada arranque. No añade ninguna ruta ni credencial de prueba a la aplicación.

```bash
# con tres ofertas simuladas
node scripts/vista-panel-simulada.js --ofertas=3
# con el servicio de ofertas sin implementar (como en main hoy): aviso, sin cifra
node scripts/vista-panel-simulada.js --sin-servicio
# opciones: --nombre="Ana Quispe"  --puerto=3100
```

El script no imprime ningún token. Imprime una dirección `http://localhost:3100/simulacion/sesion`: ábrela en el navegador y el servidor de simulación fija la cookie de la sesión ficticia y te lleva a `/panel`. Sin pasar por esa dirección, `/panel` redirige a `/ingreso`. Para cerrar la sesión simulada basta borrar la cookie o reiniciar el script (cada arranque genera un token nuevo).

Para repetir las capturas con la aplicación y el script de navegador:

```bash
node scripts/vista-panel-simulada.js --ofertas=3                 # terminal 1
cp docs/mvp/evidencias/B1.9/comprobar-navegador.mjs.txt /tmp/comprobar-navegador.mjs
node /tmp/comprobar-navegador.mjs docs/mvp/evidencias/B1.9 http://localhost:3100 completo
```

(`sin-servicio` como último argumento, con el servidor arrancado con `--sin-servicio`, genera las capturas `panel-sin-servicio-*`. Si Chrome no está en la ruta habitual de Windows, define la variable `CHROME`.)
