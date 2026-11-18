# Pruebas del MVP

Las pruebas automatizadas viven en `tests/` y usan identificadores `TM-`.
El arnés HTTP/WebSocket se ejecuta con `node --test tests/base/arnes.test.js`.
Los ayudantes insertan datos directamente por SQL y no importan servicios de negocio.
El contexto usa SQLite en memoria y el servidor usa un puerto efímero.

Ejemplo de uso:

```js
const ctx = createTestContext();
const user = createUser(ctx, { email: 'ana@test.local', displayName: 'Ana Test' });
const session = createSessionFor(ctx, user.id);
const server = await startTestServer(ctx);
const client = connect({ url: server.url, cookie: session.cookie, origin: ctx.container.config.appOrigin });
await client.waitForConnection();
```

`createSessionFor` genera 32 bytes en base64url, guarda `sha256(token)` en hexadecimal
minúscula en `sessions` y devuelve la cookie `tc_session`; no se registra ningún token
ni cookie.

`waitForConnection`, `waitFor` y `expectNoEvent` usan un tiempo máximo solo como
límite de seguridad. Las pruebas se sincronizan mediante `connect`, `connect_error`,
eventos testigo o `disconnect`; no usan pausas fijas. Si la conexión falla,
`waitForConnection` conserva el error original de Socket.IO.

## Última ejecución (B3.2)

`npm test` completo sobre `main` en `a887e67` (después del PR #23, que integra B3.1), el 17-11-2026, con Node.js v24.15.0 en Windows:
**202 pruebas, 202 pasan, 0 fallan, 0 canceladas, 0 omitidas**.
La salida literal está en [evidencias/B3.2/npm-test.txt](evidencias/B3.2/npm-test.txt).

Las pruebas automatizadas usan 115 identificadores `TM-` distintos. Un identificador puede tener varias pruebas.
Algunas pruebas sin identificador cubren contratos internos (`C-ENV`, `C-ERR`, `C-SES`, `C-MOD`), el aviso del panel y los scripts de demostración.

## Conteo por categoría

El conteo sale de ejecutar cada archivo por separado con `node --test`; la suma coincide con el total de `npm test`.
`recorrido-completo.test.js` cuenta 19 pruebas: 7 principales y los 12 pasos del recorrido TM-INT-06.

| Categoría | Archivos | Pruebas |
|---|---|---:|
| Validación compartida (`TM-VAL`) | `unit/validate` | 7 |
| Cuentas: registro, sesión y recuperación (`TM-CTA`) | `integration/cuentas-registro`, `cuentas-sesion`, `cuentas-recuperacion`, `unit/cuentas-politica` | 25 |
| CRUD de ofertas y panel (`TM-OFE`, `TM-NAV`) | `integration/ofertas-servicio`, `ofertas-http`, `panel-navegacion`, `unit/ofertas-validacion` | 32 |
| Chat, WebSocket y aviso (`TM-WS`, `TM-CHAT`, `TM-NOT`) | `ws/gateway-handshake`, `chat-mensajes`, `chat-presencia`, `aviso-mensaje`, `integration/chat-servicio`, `aviso-panel`, `unit/chat-cliente`, `notificaciones-contador` | 45 |
| Seguridad (`TM-SEG`) | `security/seguridad` | 10 |
| Integración de extremo a extremo y demos (`TM-INT`) | `integration/sesion-http-ws`, `recorrido-completo`, `demo-aviso-chat`, `vista-panel-simulada` | 31 |
| Base, núcleo web, datos y rendimiento (`TM-ARN`, `TM-BASE`, `TM-WEB`, `TM-DB`, `TM-PERF`) | `base/arnes`, `servidor`, `integration/web-base`, `rendimiento-datos`, `unit/db-migraciones`, `time` | 52 |
| **Total** | 28 archivos | **202** |

## Matriz de trazabilidad

Estados:

- **pasa:** prueba automatizada que pasó en la última ejecución.
- **manual:** documento o verificación hecha por una persona, con evidencia en el repositorio.
- **pendiente:** todavía no hay evidencia.
- **falla:** ningún ítem.

Un ítem con partes en distintos estados lleva los estados separados por «/».

### Rúbrica (R1–R11)

| Ítem | Historias | Pruebas o evidencia | Estado |
|---|---|---|---|
| R1 Problema, objetivos y cronograma | — | [problema-objetivos-cronograma.md](problema-objetivos-cronograma.md) (B0.6). Diapositivas iniciales (B3.4) | manual / pendiente (diapositivas) |
| R2 Historias de usuario | HU-01 a HU-15 | [historias-de-usuario.md](historias-de-usuario.md) con estado final; esta matriz; TM-DOC-02 (B0.7); TM-ENT-06 | manual / pendiente (revisión TM-ENT-06 del revisor) |
| R3 Diagrama de arquitectura | — | [arquitectura.md](arquitectura.md) con [imagen exportada](img/arquitectura.png) (B3.1). TM-ARQ-01: las 110 rutas del diagrama existen ([tm-arq-01-rutas.txt](evidencias/B3.1/tm-arq-01-rutas.txt)); esquema contrastado sin diferencias. Cinco afirmaciones verificadas en la revisión del PR #23, sin anotar aún en [afirmaciones-revision.md](evidencias/B3.1/afirmaciones-revision.md) | manual / pendiente (anotar las cinco afirmaciones) |
| R4 Registro y recuperación | HU-01, HU-03 | TM-CTA-01 a 05, TM-CTA-13 a 19, TM-INT-02. Prueba manual con dos navegadores ([B2.1](evidencias/B2.1/LEEME.md)); capturas de registro y recuperar ([B2.2](evidencias/B2.2/LEEME.md)) | pasa / manual |
| R5 Inicio de sesión y seguridad | HU-02, HU-04, HU-15 | TM-CTA-06 a 12, TM-INT-01 a 05, TM-SEG-01 a 10, TM-WEB-01 a 06 | pasa |
| R6 Pantalla principal con CRUD | HU-05 a HU-10 | TM-OFE-01 a 17 y 08a, TM-NAV-01 a 06, TM-INT-06 (pasos 2 a 9). Capturas de escritorio y móvil ([B2.2](evidencias/B2.2/LEEME.md)) | pasa / manual |
| R7 Chat con WebSockets | HU-11 a HU-15 | TM-WS-01 a 07, TM-CHAT-01 a 14, TM-NOT-01 a 05, TM-INT-03 a 05, TM-INT-06 (pasos 11 y 12). [websocket.md](websocket.md); TM-DEP-02 solo en local | pasa / manual |
| R8 Base de datos | HU-06 a HU-12 | TM-DB-01 a 05 y 05a, TM-OFE-08, TM-CHAT-06. [esquema.md](esquema.md) | pasa |
| R9 Calidad: pruebas, README y rendimiento | — | 202 pruebas automatizadas (esta página). TM-PERF-01 a 03 y [rendimiento.md](evidencias/B2.3/rendimiento.md). `.env.example` presente. README final (B3.3, TM-ENT-01) | pasa / pendiente (README) |
| R10 Repositorio público con commits de todos | — | 23 PR integrados en `main`. Etiqueta `v1.0-b1` sin crear (el remoto no tiene etiquetas). `git shortlog` y revisión de secretos (B3.3, B3.5) | pendiente |
| R11 Presentación, defensa y evidencias | — | Presentación, guion, ensayo y comprobante de subida (B3.4, B3.5) | pendiente |

### Obligaciones (O1–O15)

| Obligación | Historias | Pruebas o evidencia | Estado |
|---|---|---|---|
| O1 Monolito con WebSocket en el mismo proyecto | HU-05, HU-15 | TM-BASE-02 (un solo puerto para HTTP y WebSocket), TM-INT-06. [arquitectura.md](arquitectura.md) (B3.1) y TM-ARQ-01 | pasa / manual |
| O2 Entidad con 5 o más atributos validables | HU-06 | TM-OFE-01 (seis atributos), TM-OFE-02, TM-DB-01 a 05 | pasa |
| O3 Validación en cliente y servidor | HU-01, HU-03, HU-06, HU-09 | TM-VAL-01 a 07, TM-WEB-08 (mismo `validate.js` en cliente y servidor), TM-CTA-03, TM-OFE-02, TM-OFE-10, TM-SEG-02 | pasa |
| O4 Seguridad web y WebSocket | HU-02 a HU-04, HU-15 | TM-SEG-01 a 10, TM-WEB-01 a 06, TM-WS-01 a 07, TM-CTA-06 a 12. [seguridad.md](seguridad.md). TM-DEP-01 y TM-DEP-02 solo en local ([despliegue.md](despliegue.md)) | pasa / manual / pendiente (WSS público, PM-03) |
| O5 Navegabilidad | HU-05 | TM-NAV-01 a 06, TM-WEB-07. Revisión con navegador real: 199 comprobaciones ([B2.2](evidencias/B2.2/LEEME.md)). Recorrido solo con teclado y revisión móvil por una persona | pasa / pendiente (revisión humana) |
| O6 Rendimiento | HU-07, HU-11, HU-14 | TM-OFE-04, TM-OFE-08, TM-PERF-01 a 03, TM-CHAT-01, TM-NOT-01. [rendimiento.md](evidencias/B2.3/rendimiento.md) | pasa |
| O7 Stack permitido y explicación de la librería WebSocket | HU-15 | [websocket.md](websocket.md). Banco de preguntas (B3.4) | manual / pendiente (banco) |
| O8 Servidor de tiempo real propio | HU-15 | TM-BASE-02, TM-WS-04 | pasa |
| O9 README completo | — | README final (B3.3), TM-ENT-01 | pendiente |
| O10 Sin secretos ni datos reales | — | TM-SEG-09, TM-INT-07 (el seed no imprime la clave). TM-ENT-02 (B3.3) | pasa / pendiente (TM-ENT-02) |
| O11 Uso de IA declarado | — | Sección «Uso de IA» y `docs/mvp/ia.md` (B3.3, B3.5) | pendiente |
| O12 Presentación y entrega | — | Presentación, [demo.md](demo.md) y comprobante de subida (B3.4, B3.5) | pendiente |
| O13 Equipo, PYME y problema | — | [problema-objetivos-cronograma.md](problema-objetivos-cronograma.md) (B0.6) | manual |
| O14 Entrega fuera de plazo (informativo) | — | Registro del calendario (B3.5) | pendiente |
| O15 Base para el segundo bimestre (informativo) | — | Módulos de B0.4; C-MOD y TM-WEB-08 (límites de módulos con ESLint) | pasa |

### Pendientes sin evidencia

| Pendiente | Ítems | Bloque o responsable |
|---|---|---|
| Anotar en `afirmaciones-revision.md` las cinco afirmaciones del diagrama confirmadas por el revisor (TM-ARQ-01) | R3 | Revisor de B3.1 |
| README final, sección «Uso de IA», `docs/mvp/ia.md` y revisión de secretos (TM-ENT-01, TM-ENT-02) | R9, R10, O9, O10, O11 | B3.3 |
| Diapositivas, guion, banco de preguntas, ensayo y comprobante de subida | R1, R11, O7, O12, O14 | B3.4, B3.5 |
| Etiqueta `v1.0-b1` en el remoto | R10 | B3.5 |
| Despliegue público con certificado válido; captura de `wss://`, 101 y trama `42[…]` en DevTools con sesión; persistencia de una oferta creada desde el panel (TM-DEP-01 a 03) | R7, O4, HU-15 | B1.11, PM-03 |
| Recorrido completo solo con teclado y revisión móvil por una persona | O5 | B2.2 |
| Revisión de esta matriz (TM-ENT-06) | R2 | Revisor de B3.2 |
