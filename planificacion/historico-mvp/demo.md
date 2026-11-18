> **Actualización Supabase (noviembre de 2026):** la persistencia vigente usa PostgreSQL y Storage de Supabase. Consulta [la configuración actual](supabase.md). Las referencias a SQLite y sus evidencias en esta página describen la implementación anterior.

# Demostración local: preparación, datos y comprobaciones (B2.2)

Este documento prepara la base de la demostración y reúne las comprobaciones previas. **El guion y la
presentación son de B3.4**; aquí solo está lo necesario para que el recorrido funcione de extremo a extremo
con datos ficticios. Todo lo que se cita como «verificado» tiene su salida literal en
`docs/mvp/evidencias/B2.2/`.

## 1. Preparación paso a paso

Requisitos: Node.js 24 (`.nvmrc`), `npm install` hecho y Chrome, Edge o Firefox (dos ventanas: una normal y
otra privada, o dos perfiles).

1. **Crea tu `.env`** (no se versiona) a partir de `.env.example` si aún no existe:

   ```powershell
   Copy-Item .env.example .env
   ```

2. **Edítalo** y deja al menos estos valores. Usa una base **aparte** para la demo: así no tocas `data/app.sqlite`,
   la base de desarrollo.

   ```dotenv
   PORT=3000
   APP_ORIGIN=http://localhost:3000
   DATABASE_FILE=./data/demo.sqlite
   SEED_DEMO_PASSWORD=<elige una clave ficticia de al menos 10 caracteres>
   WHATSAPP_BOOKING_NUMBER=<número comercial o de demostración acordado, solo dígitos con prefijo, p. ej. 5939XXXXXXXX>
   DEMO_MAILBOX_ENABLED=true
   DEMO_MAILBOX_PASSWORD=<clave de la bandeja de pruebas, mínimo 8 caracteres>
   ```

   - `SEED_DEMO_PASSWORD` es la clave de Ana y de Luis. Ninguna contraseña real vive en el repositorio. Si la
     variable no está definida y no es producción, la aplicación usa el valor ficticio de desarrollo de
     `.env.example`; para una demo compartida define la tuya.
   - Sin `WHATSAPP_BOOKING_NUMBER` el detalle público muestra «Contacto por WhatsApp no disponible» y no se puede
     comprobar el enlace. En las pruebas automatizadas se usa el número ficticio `593990000000` y nunca se
     escribe a WhatsApp.
   - Entra siempre por el mismo origen que `APP_ORIGIN` (`http://localhost:3000`). Si abres
     `http://127.0.0.1:3000`, los formularios y el WebSocket se rechazan por origen distinto.

3. **Siembra la base** (el servidor aún apagado):

   ```powershell
   npm run seed:demo
   ```

   Crea el archivo de `DATABASE_FILE`, aplica las migraciones y deja las cuentas, ofertas, fotos y mensajes de la
   sección 2. Puedes repetirlo: no duplica nada (sección 4). Siémbrala **antes** de arrancar: el seed escribe por
   los servicios, no por el servidor en marcha, así que no emite avisos ni mensajes en tiempo real.

4. **Arranca**:

   ```powershell
   npm start        # o npm run dev para reiniciar al editar
   ```

5. **Comprueba** (sección 5) y abre `http://localhost:3000`.

Para dejar la demo como nueva (por ejemplo, tras un ensayo que borró una oferta o cambió una clave): detén el
servidor, borra **solo** la base de demostración y vuelve a sembrar.

```powershell
Remove-Item data/demo.sqlite, data/demo.sqlite-wal, data/demo.sqlite-shm -ErrorAction SilentlyContinue
npm run seed:demo
```

## 2. Datos sembrados (todos ficticios)

Cuentas con el dominio reservado `@demo.test`, ambas con la clave de `SEED_DEMO_PASSWORD`:

| Persona | Correo | Nombre visible |
|---|---|---|
| Ana | `ana@demo.test` | Ana Quispe |
| Luis | `luis@demo.test` | Luis Tupiza |

Las fechas son relativas al momento de la **primera** siembra (hora de Ecuador). «Foto» es una ilustración propia
(ver `scripts/demo-assets/CREDITOS.md`; no son fotografías de terceros).

| Dueño | Oferta | Provincia | Estado | Foto | Días desde la siembra |
|---|---|---|---|---|---|
| Ana | Caminata guiada a la laguna comunitaria | Cotopaxi | **Publicada** | sí | +10, 08:00 |
| Ana | Taller de tejido en lana de oveja | Cotopaxi | Borrador | no | +20, 09:00 |
| Ana | Noche de fogata y leyendas del páramo | Cotopaxi | Borrador | no | +25, 18:00 |
| Ana | Recorrido por la ruta del cacao fino | Manabí | **Publicada** | sí | +12, 07:30 |
| Ana | Pesca artesanal al amanecer | Manabí | **Publicada** | sí | +16, 05:30 |
| Ana | Cocina costera con productoras locales | Manabí | Borrador | no | +30, 10:00 |
| Ana | Paseo en balsa por el río y la selva | Napo | **Publicada** | sí | +18, 08:30 |
| Ana | Taller de huerto y plantas medicinales | Napo | Borrador | no | +35, 09:30 |
| Ana | Observación de aves en la reserva comunitaria | Napo | Borrador | no | +40, 06:00 |
| Ana | Visita al taller de telar y tintes naturales | Imbabura | **Publicada** | sí | +21, 09:00 |
| Ana | Mercado campesino y cocina de la sierra | Imbabura | Borrador | no | +28, 11:00 |
| Ana | **Borrador privado: ruta del café de altura** | Imbabura | Borrador | **sí** | +45, 08:00 |
| Luis | Ruta del café de altura con familias productoras | Loja | **Publicada** | sí | +15, 08:00 |
| Luis | Amanecer en el páramo del volcán | Chimborazo | **Publicada** | sí | +22, 05:00 |
| Luis | Taller de gastronomía lojana | Loja | Borrador | no | +33, 10:00 |

- Ana tiene 12 ofertas en 4 provincias (Cotopaxi, Manabí, Napo, Imbabura): el panel muestra 10 en la página 1 y 2
  en la página 2. Luis tiene 3.
- El catálogo público muestra **7** ofertas (5 de Ana y 2 de Luis), todas futuras, publicadas y con foto.
- El **borrador privado** tiene foto a propósito: demuestra que ni la oferta ni su imagen se ven fuera del panel de
  su dueña (404 para visitantes y para Luis).
- Cinco mensajes iniciales en el chat, alternando Ana y Luis. Los mensajes llevan identificadores fijos, por eso
  repetir el seed no los duplica.
- Las ofertas con foto se publican con `offers.updateOffer`, que exige foto y fecha futura (contrato C-OFE).

## 3. Comandos

| Para… | Comando |
|---|---|
| Sembrar o completar la base de demostración | `npm run seed:demo` |
| Arrancar la aplicación | `npm start` |
| Ver los correos simulados (recuperación de clave) | `http://localhost:3000/dev/bandeja` (usuario libre; clave = `DEMO_MAILBOX_PASSWORD`) |
| Ejecutar el recorrido automatizado y el seed en pruebas | `npm run seed:demo && node --test tests/integration/recorrido-completo.test.js` |
| Suite completa y lint | `npm test` · `npm run lint` |

`seed:demo` rechaza `APP_ENV=production` y `DATABASE_FILE=:memory:`. Las pruebas usan bases temporales aisladas y
no leen tu `.env` ni tus bases locales.

## 4. Idempotencia y repetir el seed días después

**Mismo día.** La segunda ejecución imprime «0 creadas, 15 conservadas» y no cambia ninguna fila ni secuencia
(`TM-INT-07`). Las filas se reconocen por clave natural: el correo de la cuenta, el título de cada oferta del dueño
y el identificador fijo de cada mensaje. Si falta algo (por ejemplo, una ejecución interrumpida), la repetición
completa solo lo que falta, incluida la publicación de las ofertas con foto; nunca despublica ni edita lo existente.

**Días después, con fechas vencidas.** Las fechas se calcularon con el reloj de la primera ejecución y el seed **no
las renueva**. Con la misma base ocurre esto (comprobado con reloj simulado a +14 días en `TM-INT-07`):

- No se duplica, edita ni borra ninguna fila; no se crean ofertas nuevas con fechas frescas porque sus títulos ya
  existen.
- Cada oferta cuya fecha ya pasó se lista en el aviso «N oferta(s) ya vencieron y no se tocaron».
- Las publicadas que vencieron **desaparecen del catálogo público** (el catálogo exige fecha futura) aunque en el
  panel sigan como «Publicada». A +14 días el catálogo pasa de 7 a 5 ofertas.
- Una oferta vencida no puede publicarse de nuevo: el servicio rechaza «La fecha y hora debe ser futura» hasta que
  edites su fecha en `/panel/ofertas/<id>/editar`.

**Recomendación.** Antes de cada ensayo o demo, vuelve a sembrar con una base nueva (comando de borrado de la
sección 1) para recuperar el catálogo completo con fechas futuras. Si prefieres conservar la base, edita las fechas
de las ofertas vencidas desde el panel.

**Si cambia la clave de Ana o Luis** (por ejemplo, al ensayar «Recuperar clave» con ellos), el seed no la restablece
y falla con «ya existe con otra contraseña», sin mostrar ninguna clave. Para ensayar la recuperación usa una cuenta
que registres en el momento (p. ej. `ensayo@demo.test`), como en el recorrido automatizado.

## 5. Comprobaciones previas (5 minutos antes de empezar)

- [ ] `npm test` y `npm run lint` terminan sin fallos.
- [ ] `http://localhost:3000/salud` responde `{"status":"ok"}`.
- [ ] En una ventana privada, `/ofertas` muestra 7 ofertas con foto y ninguna dice «Borrador».
- [ ] El detalle de una oferta pública muestra el botón «Consultar reserva por WhatsApp» (si dice «no disponible»,
      falta `WHATSAPP_BOOKING_NUMBER`).
- [ ] Con `ana@demo.test` y la clave de `SEED_DEMO_PASSWORD`, `/panel/ofertas` lista 10 ofertas y la página 2, 2.
- [ ] `/dev/bandeja` pide la clave de la bandeja y la acepta.
- [ ] La salida de `npm run seed:demo` no avisa de ofertas vencidas (si avisa, resiembra con base nueva).

## 6. Lista de comprobación manual con dos navegadores

Navegador **A**: ventana normal. Navegador **B**: ventana privada (o perfil distinto). Sirve la lista de ensayo de
B2.2 y la de la demostración. Marca cada casilla solo cuando lo hayas visto tú.

**Visitante (B, sin ingresar)**

- [ ] `/` muestra la portada y el menú con «Ofertas», «Ingresar» y «Crear cuenta».
- [ ] `/ofertas` lista las 7 ofertas con foto, provincia, fecha y cupo referencial.
- [ ] El detalle de una oferta muestra foto con texto alternativo y «Consultar reserva por WhatsApp».
- [ ] **Al pulsar el enlace se abre WhatsApp con el número autorizado y el mensaje preparado** («Hola, quiero
      consultar una reserva para … el … »). **No envíes el mensaje**; vuelve atrás.
- [ ] `/ofertas/12` (el borrador privado) responde «no encontrado» y `/ofertas/12/foto` también.

**Registro e ingreso (A)**

- [ ] En `/registro` crea `ensayo@demo.test` (clave propia de al menos 10 caracteres): una clave distinta no
      coincide y el error aparece en cliente y servidor.
- [ ] Ingresa con esa cuenta: llegas a `/panel` y el menú muestra Inicio, Mis ofertas, Chat y Salir.

**Ofertas (A, ingresada como `ana@demo.test`)**

- [ ] `/panel/ofertas` muestra 10 ofertas y la página 2 muestra 2; el filtro por «Napo» muestra 3.
- [ ] Abre el detalle por ID (`/panel/ofertas/<id>`), edita el cupo y comprueba el aviso «La oferta fue actualizada».
- [ ] En «Taller de tejido en lana de oveja» intenta publicar sin foto: se rechaza. **Sube una foto** propia o
      autorizada (JPEG, PNG o WebP de hasta 2 MiB; ver nota al final) con su texto alternativo y **publícala**.
- [ ] En B, `/ofertas` ahora muestra 8 ofertas, con la nueva incluida y con su foto.
- [ ] Con la sesión de Luis (otra cuenta), `/panel/ofertas/<id de una oferta de Ana>` responde «no encontrado».
- [ ] **Elimina** «Noche de fogata y leyendas del páramo»: «Eliminar» abre una pantalla que pregunta si quieres
      eliminarla definitivamente; «Cancelar» la conserva y «Confirmar eliminación» la borra. Tras confirmar, el
      listado muestra «La oferta fue eliminada».

**Recuperar clave (A, cuenta `ensayo@demo.test`)**

- [ ] `/recuperar` con ese correo: aparece el aviso genérico. En `/dev/bandeja` (con su clave) llega el mensaje con
      el enlace.
- [ ] El enlace abre `/restablecer`; guarda una clave nueva. La sesión anterior de esa cuenta queda cerrada y el
      mismo enlace ya no sirve.

**Chat y aviso (A = Ana, B = Luis)**

- [ ] En B ingresa como `luis@demo.test` y abre `/panel` (fuera del chat). En A abre `/panel/chat`: ves los 5
      mensajes sembrados y «Conectados» con Ana.
- [ ] En A escribe un mensaje: en B aparece la insignia de mensaje nuevo en «Chat» **sin recargar**.
- [ ] En B abre el chat: el mensaje está en el historial, «Conectados (2)» y la insignia desaparece. Responde en B:
      A lo recibe al instante, sin aviso (ya está en el chat).
- [ ] Recarga A: el historial conserva todos los mensajes.
- [ ] Pulsa «Salir» en A: su chat deja de recibir; recargar `/panel` lleva a `/ingreso`. B sigue conectado.

**Borradores privados (A y B)**

- [ ] Como Ana, `/panel/ofertas/12/foto` muestra la imagen; como Luis y como visitante, responde «no encontrado».
- [ ] La oferta «Borrador privado…» no aparece en `/ofertas`.

**Revisión visual y de uso** (escritorio ≥ 1280 px y móvil de 390 px: en el navegador, herramientas de desarrollo →
vista de dispositivo)

- [ ] El menú, los formularios, las ofertas y el chat usan la misma tipografía, colores y botones.
- [ ] No hay barra de desplazamiento horizontal en ninguna pantalla (portada, catálogo, detalle, ingreso, registro,
      recuperar, panel, mis ofertas, formulario, chat).
- [ ] Con solo el teclado: Tab recorre cada pantalla; el primer Tab es «Saltar al contenido»; siempre se ve dónde
      está el foco; Enter activa enlaces y botones; el chat se envía sin ratón.
- [ ] Los mensajes de error y de éxito se leen con claridad.

### Registro del ensayo humano

El Integrante 4 realizó las comprobaciones funcionales con dos sesiones de navegador y comunicó una duración
aproximada de cinco minutos. La cifra es la duración declarada por la persona, sin precisión de cronómetro.

| Fecha | Quién lo hizo | Duración del recorrido completo | Observaciones | ¿Pasan todas las casillas? |
|---|---|---|---|---|
| 2026-11-17 | Julián, Integrante 4 | Aproximadamente 5 minutos, según su declaración | Confirmó listado y filtro, permisos, rechazo de publicación sin foto, subida y publicación, catálogo, apertura de WhatsApp, recuperación de contraseña, chat, avisos y cierre de sesión. Observaciones de usabilidad y paginación en §8, filas 6 y 7. | Comprobaciones funcionales confirmadas; revisión humana completa de teclado y móvil sin confirmar |

Nota sobre la foto de ensayo: la subida solo admite JPEG, PNG o WebP. Para tener una imagen propia a mano puedes
exportar una de las ilustraciones: `node -e "import('sharp').then(({default:s})=>s('scripts/demo-assets/selva-napo.svg').png().toFile('foto-ensayo.png'))"`.
Bórrala al terminar; no se versiona.

## 7. Qué prueba cada comprobación

| Qué | Cómo | Quién | Dónde |
|---|---|---|---|
| Recorrido completo, del registro al cierre de sesión, con servicios reales (`TM-INT-06`; repite `TM-OFE-09` y `TM-CHAT-01` a `03` con cuentas reales) | `node --test tests/integration/recorrido-completo.test.js` | Automática | `evidencias/B2.2/pruebas-bloque.txt` |
| Todos los enlaces del menú dan 200 y repiten el menú (`TM-NAV-06`) | ídem | Automática | ídem |
| Mensaje rechazado o repetido no genera aviso; uno válido sí (`TM-NOT-05`) | ídem | Automática | ídem |
| `npm run seed:demo` dos veces deja las mismas filas, y qué pasa con fechas vencidas (`TM-INT-07`) | ídem y `npm run seed:demo` real | Automática | `pruebas-bloque.txt`, `seed-demo.txt` |
| Interfaz en Chrome real, escritorio y móvil: título y `h1`, desbordamiento, imágenes, Tab y foco, chat con aviso, enlace de WhatsApp (solo se lee, no se abre), privacidad de borradores | `comprobar-navegador.mjs.txt` | Automática (Chrome headless, tres perfiles); **no sustituye al ensayo humano** | `navegador-interfaz.txt` y capturas |
| Ensayo funcional con dos sesiones de navegador, carga de imagen, apertura de WhatsApp, recuperación, chat y cierre de sesión | Lista de la sección 6 | Julián, Integrante 4 | Registro del ensayo en §6; aproximadamente 5 minutos declarados |

La prueba automatizada verifica el enlace de WhatsApp comparando el `href` con el valor exacto esperado y bloquea
cualquier conexión de red que no sea la del servidor local de la prueba. La apertura real del enlace es solo
manual.

## 8. Incompatibilidades y observaciones entre módulos

Ninguna rompe un contrato de PLAN-MVP §5.1 ni el recorrido; se devuelven a su bloque responsable para corregirlas
de forma coordinada (este bloque no parcha módulos ajenos):

| # | Qué se ve | Dónde | Bloque responsable |
|---|---|---|---|
| 1 | En «Conectados» las viñetas se montan sobre el nombre anterior («Ana Quispe•Luis Tupiza», `escritorio-chat-dos-navegadores.png`). Ya se avisó en B2.1; sigue en `main`. | `.chat__presencia-lista` en `public/css/app.css` | B1.8 (Integrante 3) |
| 2 | Los mensajes de campo obligatorio salen con género incorrecto: «El descripción es obligatorio», «El provincia…», «El ubicación…» (`escritorio-foco-selector-fecha.png`). | `src/shared/validation/validate.js` (`El ${label} es obligatorio`) | B0.3 (Integrante 1) |
| 3 | El catálogo (`/ofertas`) rotula la foto «Foto de <título>» y no usa el texto alternativo guardado, que el detalle sí usa. El DTO de `listPublicOffers` no lo incluye. | `src/web/views/offers/publica-lista.ejs` y `offers.service.js` | B1.5 / B1.4 (Integrante 2); cambiar el DTO sería un ajuste de contrato C-OFE |
| 4 | Enviar un mensaje repetido no cambia filas, pero `ON CONFLICT DO NOTHING` consume un valor de `AUTOINCREMENT` en `chat_messages` (los ids saltan). El seed lo evita consultando el historial antes de publicar. | `src/modules/chat/data/messages.repo.js` | B1.7 (Integrante 3); informativo |
| 5 | En el campo de fecha y hora, el foco del icono del selector lo dibuja el propio navegador, no el CSS del proyecto. El resto de paradas muestran el anillo del proyecto. | formulario de oferta | B1.5 (Integrante 2); informativo |
| 6 | En el ensayo humano, el formulario de edición rechazó correctamente publicar sin foto. La carga de la foto está en el detalle y el error de publicación no ofrece un acceso directo a ella. Pendiente de revisión de usabilidad para añadir un enlace o una indicación que lleve a «Añadir foto» en el detalle. | `src/web/views/offers/formulario.ejs` y `detalle.ejs` | B1.5 (Integrante 2); pendiente de coordinación |
| 7 | En el ensayo humano se observaron viñetas junto a los enlaces de paginación que dificultan su lectura. Pendiente de ajustar el estilo de la lista de paginación conservando el marcado de navegación, los enlaces y `aria-current`. | `src/web/views/offers/lista.ejs` y estilos de paginación en `public/css/app.css`; revisar también el catálogo | B1.5 (Integrante 2), en coordinación con el Integrante 4 por el CSS compartido; pendiente |

Con sesión, el menú no incluye el catálogo público (`/ofertas`): coincide con PLAN-MVP §2.1 (Inicio, Mis ofertas,
Chat, Salir), así que para ver el catálogo como visitante se usa la ventana privada.
