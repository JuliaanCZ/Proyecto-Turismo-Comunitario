# Evidencias B2.2 — Integración del panel y datos de demostración

Fecha de las ejecuciones: 17/11/2026 · Node v24.22.3 · Chrome 157.0.8103.79 (Windows 11) · rama
`bloque/B2.2-integracion-demo` creada desde `main` (`b97dfdb`, con B1.3, B1.5, B1.8, B1.9, B1.10, B2.1 y B2.3
integrados). Todo se ejecutó con bases temporales aisladas; `data/app.sqlite` no se tocó.

## Qué es automatizado y qué queda para una persona

| Tipo | Qué | Estado |
|---|---|---|
| **Automatizado** | `TM-INT-06`, `TM-NAV-06`, `TM-NOT-05`, `TM-INT-07` (`pruebas-bloque.txt`) | 19 de 19 pasan |
| **Automatizado** | `npm run seed:demo` dos veces (`seed-demo.txt`), `npm test`, `npm run lint`, contraste | pasan |
| **Automatizado, con navegador real** | Revisión de interfaz con Chrome headless y tres perfiles (`navegador-interfaz.txt`, capturas) | 199 comprobaciones pasan, 0 fallan |
| **Humano — REALIZADO** | Comprobaciones funcionales con ventana normal y privada, carga de imagen, publicación, permisos, catálogo, apertura de WhatsApp, recuperación de contraseña, chat, avisos y cierre de sesión | Julián (Integrante 4) confirmó el funcionamiento en el ensayo del 2026-11-17. Observaciones de usabilidad y paginación registradas en `docs/mvp/demo.md` §8, filas 6 y 7. La imagen subida durante el ensayo fue una captura propia, no una fotografía del destino |
| **Humano — DURACIÓN DECLARADA** | Tiempo del recorrido manual para dimensionar el guion de B3.4 | Aproximadamente **5 minutos**, según lo comunicado por Julián; sin precisión de cronómetro. Los 35 s del script corresponden a la automatización |
| **Humano — SIN CONFIRMAR** | Recorrido completo solo con teclado y revisión móvil | Las comprobaciones automatizadas constan arriba; la ejecución humana de estas dos revisiones no se ha confirmado |

## Archivos

| Archivo | Qué evidencia |
|---|---|
| `pruebas-bloque.txt` | `node --test tests/integration/recorrido-completo.test.js`: `TM-INT-06` (12 pasos con registro, ingreso, ofertas, foto, catálogo, enlace de WhatsApp, bandeja, chat, aviso y cierre de sesión), `TM-NAV-06`, `TM-NOT-05` y cuatro pruebas de `TM-INT-07`. |
| `seed-demo.txt` | `npm run seed:demo` dos veces sobre una base temporal: primera «2 cuentas, 15 ofertas, 8 fotos, 7 publicaciones, 5 mensajes»; segunda «0 creadas, todo conservado»; conteo de filas por tabla. |
| `npm-test.txt` · `npm-lint.txt` | Suite completa (192 pruebas: las 173 previas más las 19 de este bloque) y `eslint .`. |
| `check-contraste.txt` | `node scripts/check-contraste.js`: 26 de 26 pares de color cumplen. |
| `comprobar-navegador.mjs.txt` | Script de la revisión de interfaz (se guarda como `.txt` para que ESLint no lo analice; se ejecuta renombrándolo a `.mjs`, desde la raíz: `node comprobar-navegador.mjs <carpeta>`). Genera contraseñas al azar que no imprime. |
| `navegador-interfaz.txt` | Salida literal de ese script. |
| `escritorio-*.png` · `movil-*.png` | Capturas de portada, catálogo, detalle público, ingreso, registro, recuperar, panel, mis ofertas, formulario, detalle propio y chat (escritorio 1280×800, móvil 390×844). `escritorio-luis-aviso.png`: insignia en el panel de Luis; `escritorio-chat-dos-navegadores.png` y `movil-chat-luis.png`: chat entre Ana y Luis; `*-foco-selector-fecha.png`: foco en el icono del selector de fecha. |

## Controles de que las pruebas detectan fallos

Como en B2.1, se rompió a propósito el código y se comprobó que la prueba falla; después se revirtió (el árbol
quedó sin cambios en `src/`):

- Seed que ignora las ofertas existentes y siempre crea: `TM-INT-07` falla (3 de 4 pruebas).
- `chat.handlers.js` que notifica también los envíos repetidos (`if (true)`): `TM-NOT-05` y los pasos 11 y 12 de
  `TM-INT-06` fallan.

## Qué comprueba la revisión de interfaz con navegador (y qué no)

- **Sí:** en escritorio y móvil, cada pantalla tiene `<title>` y un solo `<h1>`, `lang="es-EC"`, la etiqueta
  `viewport`, texto de al menos 14 px (el mínimo medido fue 15 px) y **ninguna barra de desplazamiento
  horizontal** (`scrollWidth` igual al ancho de la ventana en las 29 mediciones: 1265 o 1280 en escritorio, según haya o no
  barra vertical, y 390 en móvil); el menú de cada pantalla es el esperado (visitante: Ofertas, Ingresar, Crear cuenta; con sesión: Inicio,
  Mis ofertas, Chat); las imágenes cargan y tienen texto alternativo; Tab recorre las pantallas clave, el primer
  Tab es «Saltar al contenido» y Enter mueve el foco al contenido; cada parada de Tab muestra el anillo de foco y
  no sale de la ventana; el borrador privado y su foto dan 404 a visitante y a Luis y 200 a su dueña; el enlace de
  WhatsApp apunta a `wa.me` con el número ficticio y el mensaje preparado (**sin abrirlo**); Luis ve la insignia de
  mensaje nuevo sin recargar, el historial y «Conectados (2)»; «Salir» lleva a `/ingreso` y `/panel` vuelve a
  pedir ingreso; ningún perfil registró errores de consola, de red ni excepciones (las respuestas 404 de las
  pruebas de privacidad se excluyen a propósito).
- **No:** gusto estético, lectura asistida por pantalla real, navegadores distintos de Chrome, dispositivos físicos
  ni la apertura real de WhatsApp. El ensayo humano posterior confirmó la apertura de WhatsApp; las demás
  limitaciones se mantienen.

## Incompatibilidades y observaciones (detalle en `docs/mvp/demo.md` §8)

Ninguna rompe un contrato de §5.1 ni el recorrido. Para corregir de forma coordinada:

1. **B1.8 (Integrante 3):** las viñetas de «Conectados» se montan sobre el nombre anterior (visible en
   `escritorio-chat-dos-navegadores.png`); ya se avisó en B2.1 y sigue en `main`.
2. **B0.3 (Integrante 1):** «El descripción / provincia / ubicación es obligatorio» (género incorrecto) en
   `validate.js`.
3. **B1.5 / B1.4 (Integrante 2):** el catálogo usa «Foto de <título>» en vez del texto alternativo guardado;
   exigiría incluirlo en el DTO de `listPublicOffers` (ajuste de contrato C-OFE).
4. **B1.7 (Integrante 3), informativo:** un envío repetido consume un valor de `AUTOINCREMENT` aunque no inserte.
5. **B1.5 (Integrante 2), informativo:** el anillo de foco del icono del selector de fecha lo pone el navegador.
6. **B1.5 (Integrante 2):** mejorar la orientación desde el error de publicación sin foto hacia la carga de imagen en el detalle.
7. **B1.5 (Integrante 2), en coordinación con el Integrante 4:** ajustar las viñetas de la paginación señaladas durante el ensayo humano.
