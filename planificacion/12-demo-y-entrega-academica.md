# 12 — Demostración y entrega académica

> **ESTADO: REDACTADO el 2026-11-16, con pendientes externos.**
> Contiene el guion de 15 minutos y 5 de preguntas (§2), los datos de demostración, los entregables, la declaración de IA, el plan de commits y de revisión humana (§6) y la contingencia (§7). **Pendientes externos:** reparto (Q-03), conformidad y formato (Q-01), notificación y medición (Q-07, Q-09), Common Criteria (Q-02), alojamiento (Q-04), repositorio (Q-11) y **PayPal Sandbox (Q-08: T-PAG-24 y EV-07)**.
> **Siguiente paso exacto:** 00 §12, revisión de consistencia entre documentos.
> **No se inventan integrantes, fechas ni resultados.** El reparto queda pendiente de Q-03. La conformidad con la guía queda pendiente de Q-01.

---

## 1. Qué debe mostrar la demostración (según `PLAN §4`)

Compra grupal e ingreso por QR (recorrido principal), y además recuperación de clave, CRUD, chat y evidencias de seguridad. Formato: 15 minutos de presentación y 5 de preguntas, con todos los integrantes.

## 2. Guion de 15 minutos y 5 de preguntas

**Condiciones.** Todo se ensaya con la semilla de §3 refrescada poco antes (R-15) y con **`PAYMENT_PROVIDER=fake` declarado en voz alta** al llegar al pago (§7). Ventanas preparadas de antemano, con sesión iniciada: A (GAD), B (operador), C (turista Ana), D (turista Luis), Mailpit y la matriz de pruebas. **Quién presenta cada bloque está PENDIENTE** hasta conocer a los integrantes (Q-03): la columna «Integrante» no se rellena con nombres inventados y el reparto se hará con §6.1.

### 2.1 Tiempos por bloque

| Minutos | Peso | Bloque | Acciones concretas en pantalla | Evidencia que se enseña | Integrante |
|---|---|---|---|---|---|
| 0:00–1:00 | Contexto | Problema y actores | Diagrama del monolito; una frase por rol (GAD, operador, turista, administrador). | EV-01 | Pendiente (Q-03) |
| 1:00–4:00 | Funciones académicas | CRUD y revisión | Ventana A: crear oferta y enviarla. Ventana B: aprobarla. Mostrar el catálogo con filtro por provincia y paginación. Con `dual@demo.test`, intentar autoaprobar y mostrar el rechazo. | T-OFE-05 a 13 (informe) | Pendiente |
| 4:00–8:00 | **Flujo principal** | Compra grupal | Ventana C: «Reservar» para cinco, un asistente por cada uno, total calculado por el servidor, cuenta atrás **informativa**; pagar con el simulador (decir «adaptador fake»); volver y ver las cinco entradas con QR. | T-RES-01, T-PAG-25 | Pendiente |
| 8:00–10:00 | **Flujo principal** | Ingreso | Ventana B, con la actividad **en curso sembrada**: pegar un código y «Consultar» (no consume); «Registrar ingreso»; repetir y mostrar el rechazo con la misma hora. Cámara solo si está probada (§7). | T-ENT-05 a 07 | Pendiente |
| 10:00–11:00 | Funciones académicas | Recuperación de clave | «Olvidé mi contraseña»; abrir Mailpit; enlace; nueva contraseña; mostrar que la sesión anterior ya no sirve. | T-CTA-10 a 14 | Pendiente |
| 11:00–13:00 | Funciones académicas | Chat y notificación | Ventanas C y D: presencia de usuarios únicos; mensaje de Ana; Luis, **fuera del chat**, ve el aviso en el panel; recargar y ver el historial. | T-CHAT-03, 08 a 10 | Pendiente |
| 13:00–15:00 | **Seguridad y evidencias** | Cierre | Aislamiento: `gad.colibries` abre una oferta del GAD 1 y obtiene 404. Último cupo: Ana y Luis sobre la oferta de un cupo (en vivo, o el informe de T-RES-09). Mostrar EV-03 y EV-05 (matriz), EV-04 (informes) y EV-06 (medición) **con su estado real**. | EV-03 a EV-06 | Pendiente |
| 15:00–20:00 | Preguntas | 5 min, todos | Ver 2.3. | — | Todos |

**Reparto del tiempo:** flujo principal 6 min (40 %), funciones académicas 6 min (40 %), contexto 1 min y seguridad y evidencias 2 min (20 %). Si un bloque se alarga se recortan **primero** el chat y la recuperación de clave, nunca el flujo principal.

### 2.2 Puntos de control

- **Minuto 8:** el turista ya tiene sus cinco entradas; si no, pasar a la reserva confirmada sembrada (§7).
- **Minuto 10:** el ingreso quedó registrado y rechazado la segunda vez; si no, mostrar el informe de T-ENT-07.
- **Minuto 13:** empezar el cierre aunque el chat no haya terminado.
- **Se dice en voz alta:** el pago es del adaptador `fake`; **la integración real con PayPal Sandbox no está demostrada** (EV-07 pendiente) y toda evidencia sin ejecutar se presenta como pendiente.

### 2.3 Preguntas previstas (5 minutos)

| Pregunta | Dónde está la respuesta |
|---|---|
| ¿Cómo evitan vender más cupos que los disponibles? | Bloqueo de la oferta y cálculo de inventario en una transacción (04 TX-05); T-RES-09. |
| ¿Qué pasa si PayPal confirma tarde o el cobro es incierto? | Liquidación y casos en revisión (04 TX-09, TX-11); T-PAG-13 a 17. |
| ¿Cómo se protege el QR? | Solo se guarda el hash y una copia cifrada; el token no sale en URL ni registros (05 §7). |
| ¿Qué se probó contra PayPal real? | **Nada todavía:** T-PAG-24 y EV-07 pendientes (Q-08). |
| ¿Qué hizo la IA y qué revisaron ustedes? | Declaración de §5 y registro de §6.3. |
| ¿Qué falta? | §8 con sus pendientes externos. |

Quién responde cada pregunta se define con el reparto (§6.1).

## 3. Datos semilla y cuentas ficticias (decididos)

Dominio reservado `@demo.test`. Contraseña desde `SEED_DEMO_PASSWORD` (en un despliegue público no debe ser la documentada para local).

| Cuenta | Asignaciones | Uso en la demostración |
|---|---|---|
| `admin@demo.test` | `ADMIN` | Moderación y casos en revisión. |
| `gad.sanisidro@demo.test` | `GAD` del GAD 1 | Crear y editar ofertas. |
| `gad.colibries@demo.test` | `GAD` del GAD 2 | Aislamiento entre instituciones. |
| `operador.laguna@demo.test` | `OPERATOR` de la atracción 1 | Aprobar, suspender, registrar ingresos. |
| `operador.cascada@demo.test` | `OPERATOR` de la atracción 2 | Aislamiento entre atracciones. |
| `dual@demo.test` | `GAD` del GAD 1 y `OPERATOR` de la atracción 1 | Prohibición de autoaprobación. |
| `turista.ana@demo.test`, `turista.luis@demo.test` | `TOURIST` | Compra, chat y competencia por el último cupo. |

Ofertas y casos sembrados: ver [03 §9](03-datos-estados-e-invariantes.md). Imprescindibles para la demostración: una oferta abierta con cupo, una actividad **en curso** con entradas válidas (para mostrar el ingreso aunque no se compre en vivo), una oferta con un solo cupo, un caso `REVIEW_REQUIRED` y una reserva vencida.

**Las fechas de la semilla son relativas al momento de sembrar:** hay que volver a sembrar poco antes de la demostración (R-15). Para encadenar compra e ingreso en vivo, el entorno de demostración define `CHECKIN_EARLY_MINUTES` (S-16); con el valor 0 del plan se usa la actividad en curso sembrada.

## 4. Entregables (lista decidida)

| Entregable | Evidencia | Estado hoy |
|---|---|---|
| Diagrama del monolito | EV-01 | Diseñado en 02; por exportar |
| Diagrama del modelo relacional | EV-02 | Pendiente (03 §1) |
| Matriz de requisitos con pruebas | EV-03 | Diseñada en 01; sin resultados |
| Informes de pruebas | EV-04 | No existen |
| Matriz de seguridad | EV-05 | Pendiente; objetivos Common Criteria no disponibles |
| Medición de rendimiento | EV-06 | No ejecutada |
| Evidencia de PayPal Sandbox real | EV-07 | Pendiente de credenciales |
| README con ejecución y declaración de uso de IA | EV-08 | Por redactar al implementar |
| Repositorio público con commits de todos y etiqueta `v1.0-b1` | EV-09 | No existe repositorio |
| Presentación | EV-10 | Por preparar |
| Entrega (enlace o ZIP) según la guía | EV-11 | Formato pendiente de la guía |

## 5. Declaración de uso de IA (criterio decidido)

El README declarará con veracidad qué se generó con IA (planificación y código por paquetes), con qué herramientas, y cómo el equipo lo revisó. No se atribuirá a personas trabajo que no hicieron.

## 6. Commits auténticos y comprensión del código

**Reglas (no negociables).** Cada integrante confirma con **su propia cuenta** lo que revisó y entiende. **No se simula autoría ni actividad:** no se reparten commits artificialmente, no se reescriben autorías ni se alteran fechas, y nadie confirma con la cuenta de otra persona. Este documento **no crea commits**.

### 6.1 Cómo repartir el trabajo (pendiente de Q-03)

1. Con la lista real de integrantes (Q-03) se asigna **una persona responsable de revisión por paquete** de 10 §4, equilibrando tamaño (S, M, L) y fase; los paquetes del camino principal (`P3-01`, `P4-03`, `P5-02`) se reparten de modo que cada integrante pueda explicar al menos uno.
2. La asignación se anota en `ESTADO-IMPLEMENTACION.md` (11 §3) con paquete, responsable y fecha. Mientras Q-03 siga abierta la columna dice «Pendiente»; **no se inventan nombres**.
3. Cada integrante presenta al menos un bloque de §2 y puede responder sobre los paquetes que revisó.

### 6.2 Cómo se registra un commit auténtico

- **Un paquete, una rama y una o más confirmaciones pequeñas**, con el identificador en el mensaje (`P3-01: …`), hechas por quien **revisó** ese paquete tras ejecutar sus pruebas.
- Antes de confirmar, la persona ejecuta los comandos del prompt (11 §4), lee el informe de 11 §3 y comprueba que el diff coincide con la ficha.
- Si la IA produjo el código y otra persona lo revisó, confirma quien revisó; la línea `Co-authored-by` se incluye solo si la herramienta la añade realmente, sin ocultarla ni inventarla.
- Etiqueta `v1.0-b1` sobre el commit final (PE-04). EV-09 exige repositorio **público** y se verifica en el remoto (D7-10, Q-11).
- **Comprobación antes de entregar:** revisar el historial por autor y fecha; cualquier desequilibrio se **declara**, no se corrige reescribiendo historia.

### 6.3 Cómo se documenta el uso de IA y la revisión humana

| Dónde | Qué consta |
|---|---|
| README (EV-08, §5) | Declaración veraz: qué se generó con IA (planificación y código por paquetes), con qué herramientas y versiones y cómo se revisó. |
| `ESTADO-IMPLEMENTACION.md` (11 §3) | Por paquete: quién implementó (IA o persona), **quién revisó** y cuándo, pruebas ejecutadas con su resultado real y pendientes. |
| Informe del paquete (`docs/evidencias/<ID>/`) | Salida literal de las pruebas y desviaciones respecto de la ficha. |
| Revisión humana | Quien revisa responde por escrito qué hace el paquete, por qué y cómo se prueba, y marca «revisado» **solo** si puede explicarlo en la defensa. |

Lo no revisado se declara «no revisado» y no se presenta como entendido.

## 7. Contingencia

### 7.1 Demo con `fake` frente a evidencia real

| Concepto | Qué demuestra | Qué NO demuestra |
|---|---|---|
| **Demo con el adaptador `fake`** | Nuestra lógica: reserva, liquidación, entradas y conciliación (T-PAG-01 a 23, 25, 26). | Que PayPal se comporte así. |
| **Evidencia real de Sandbox (EV-07)** | La integración con PayPal Sandbox (T-PAG-24, manual, con fecha, versión y resultado). | **Hoy no existe: PENDIENTE por Q-08.** |

**Una demostración con `fake` no es evidencia de PayPal y se presenta así.** T-PAG-24 y EV-07 siguen pendientes hasta ejecutarlos con credenciales y un despliegue alcanzable (PE-02).

### 7.2 Alternativas breves

| Fallo | Respuesta inmediata | Se dice |
|---|---|---|
| **PayPal Sandbox no responde** (solo si se estaba usando) | Pasar a `PAYMENT_PROVIDER=fake` **antes** de empezar el bloque; si falla en vivo, abrir la reserva confirmada sembrada y mostrar sus entradas. | «Usamos el simulador.» EV-07 se muestra **solo si existe**, con su fecha; si no, se dice que está pendiente. |
| **La cámara falla** | Pegar el código en el campo (siempre visible) y usar «Consultar» y «Registrar ingreso». T-ENT-14d sigue pendiente como prueba manual. | «La cámara es un complemento; el ingreso no depende de ella.» |
| **El despliegue está dormido o caído** | Demostración local con Docker, preparada y probada de antemano; calentar el servicio unos minutos antes si el alojamiento duerme. | Que la URL pública no estuvo disponible; no afirmar HTTPS ni WSS (PE-02) si no se comprobaron. |
| **Sin red** | Local completo con Docker y Mailpit; el pago es `fake`. | Que no se mostró PayPal. |
| **La semilla quedó vieja** (fechas relativas, R-15) | Volver a sembrar antes de cada ensayo y usar la actividad en curso sembrada. | — |
| **Se acaba el tiempo** | Recortar chat y recuperación de clave (§2.1), nunca el flujo principal; enseñar informes (EV-04) en lugar de repetir pruebas. | — |

**Nunca** se sustituye una evidencia pendiente por una simulada ni se muestra una captura antigua como si fuera actual.

## 8. Pendientes que impiden afirmar cumplimiento completo

| Materia | Pendiente | Depende de |
|---|---|---|
| Aplicaciones Web Avanzadas | Contrastar los requisitos con la guía real. | Q-01 |
| Aplicaciones Web Avanzadas | Confirmar qué es la «notificación adicional», y formato y umbral de la medición. | Q-07, Q-09 |
| Aplicaciones Web Avanzadas | Formato de entrega y de la presentación. | Q-01 |
| Software Seguro | Objetivos Common Criteria de la propuesta. | Q-02 |
| Ambas | Pago real en Sandbox ejecutado y documentado. | Q-08 |
| Ambas | Despliegue público con HTTPS y WSS. | Q-04 |
| Ambas | Todo el código, las pruebas y las evidencias: **nada está implementado**. | Implementación |
