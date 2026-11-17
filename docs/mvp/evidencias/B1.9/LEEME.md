# Evidencias de B1.9 — Panel principal y navegación coherente

Fecha: 2026-11-17 · Windows · Node v24.22.3 · Chrome 157 (headless).

## Qué hay aquí

| Archivo | Contenido |
|---|---|
| `panel-navegacion.txt` | `node --test tests/integration/panel-navegacion.test.js`: 13 pruebas, 13 pasan (TM-NAV-01 a TM-NAV-05 y extras) |
| `npm-test.txt` | `npm test`: 69 pruebas, 69 pasan |
| `npm-lint.txt` | `npm run lint`: código de salida 0 |
| `check-contraste.txt` | `node scripts/check-contraste.js`: 26 de 26 pares cumplen (se añadió el par de la insignia) |
| `navegador-completo.txt` | Medidas en Chrome con la vista simulada (3 ofertas): menú, h1, título, desborde, controles de 44 px, foco por teclado |
| `navegador-sin-servicio.txt` | Lo mismo con el servicio de ofertas sin implementar (el estado real de `main` hoy) |
| `portada-escritorio.png`, `portada-movil.png` | Portada pública (1280×800 y 375×812) |
| `panel-escritorio.png`, `panel-movil.png` | Panel con sesión simulada y **3 ofertas simuladas** |
| `panel-sin-servicio-escritorio.png`, `panel-sin-servicio-movil.png` | Panel sin servicio de ofertas: aviso y ninguna cifra |
| `404-escritorio.png`, `404-movil.png` | Página 404 con sesión: menú completo y enlace de regreso al panel |
| `foco-saltar-movil.png` | Enlace «Saltar al contenido» con el anillo de foco |
| `comprobar-navegador.mjs.txt` | Script usado para medir y capturar (se guarda como `.txt` para que ESLint no lo analice; se ejecuta renombrándolo a `.mjs`) |

**Las cifras de las capturas del panel son simuladas.** La sesión y el servicio de ofertas son falsos (ver abajo). Ninguna proviene de una base real.

En `navegador-completo.txt` las dos líneas «Failed to load resource … 404 … /panel/no-existe» son esperadas: la comprobación abre a propósito una ruta inexistente para capturar el 404.

## Cómo ver la vista autenticada mientras no exista el ingreso real

Hasta que B1.2 entregue `/ingreso`, no hay forma legítima de abrir sesión. `scripts/vista-panel-simulada.js` levanta la aplicación real (`createApp`) con una sesión y un servicio de ofertas **falsos**. No es parte de `npm start`, ni de `server.js`, ni de `src/**`; se niega a arrancar con `APP_ENV=production`, escucha solo en `127.0.0.1`, usa una base en memoria y genera un token nuevo en cada arranque. No añade ninguna ruta ni credencial de prueba a la aplicación.

```bash
# con tres ofertas simuladas
node scripts/vista-panel-simulada.js --ofertas=3
# con el servicio de ofertas sin implementar (como en main hoy): aviso, sin cifra
node scripts/vista-panel-simulada.js --sin-servicio
# opciones: --nombre="Ana Quispe"  --puerto=3100
```

El script imprime `Cookie: tc_session=<token>`. Abre `http://localhost:3100/`, crea esa cookie en las herramientas del navegador (Chrome: F12 → Application → Cookies → `http://localhost:3100`, nombre `tc_session`, ruta `/`) y abre `http://localhost:3100/panel`. Sin la cookie, `/panel` redirige a `/ingreso`.

Para repetir las capturas con la aplicación y el script de navegador:

```bash
node scripts/vista-panel-simulada.js --ofertas=3                 # terminal 1; copia el token impreso
cp docs/mvp/evidencias/B1.9/comprobar-navegador.mjs.txt /tmp/comprobar-navegador.mjs
node /tmp/comprobar-navegador.mjs docs/mvp/evidencias/B1.9 http://localhost:3100 <token> completo
```

(`sin-servicio` como último argumento, con el servidor arrancado con `--sin-servicio`, genera las capturas `panel-sin-servicio-*`. Si Chrome no está en la ruta habitual de Windows, define la variable `CHROME`.)
