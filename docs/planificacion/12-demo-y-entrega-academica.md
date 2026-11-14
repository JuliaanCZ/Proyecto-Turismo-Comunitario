# 12 — Demostración y entrega académica

> **ESTADO: PARCIAL — punto de avance guardado el 2026-11-12.**
> Contiene los datos de demostración, la lista de entregables, el esqueleto del guion y los pendientes que impiden afirmar cumplimiento, **ya decididos**. Faltan el guion paso a paso, el plan de contingencia detallado y el plan de commits (⏳).
> **Siguiente paso exacto:** §2 — guion minuto a minuto con acciones concretas en pantalla.
> **No se inventan integrantes, fechas ni resultados.** El reparto queda pendiente de Q-03. La conformidad con la guía queda pendiente de Q-01.

---

## 1. Qué debe mostrar la demostración (según `PLAN §4`)

Compra grupal e ingreso por QR (recorrido principal), y además recuperación de clave, CRUD, chat y evidencias de seguridad. Formato: 15 minutos de presentación y 5 de preguntas, con todos los integrantes.

## 2. Esqueleto del guion (⏳ detallar acciones)

| Minutos | Bloque | Contenido | Integrante |
|---|---|---|---|
| 0–1 | Contexto | Problema, actores y recorrido. Diagrama del monolito. | Pendiente |
| 1–4 | CRUD y revisión | El GAD crea una oferta, la envía; el operador la aprueba; aparece en el catálogo con filtro y paginación. Intento de autoaprobación con `dual@demo.test` rechazado. | Pendiente |
| 4–8 | Compra grupal | El turista reserva para cinco, ve la cuenta atrás, paga, recibe cinco QR. | Pendiente |
| 8–10 | Ingreso | El operador consulta una entrada sin consumirla, registra el ingreso, y un segundo intento se rechaza. | Pendiente |
| 10–11 | Recuperación de clave | Solicitud, correo en la bandeja de pruebas, cambio y cierre de la sesión anterior. | Pendiente |
| 11–13 | Chat | Dos usuarios, presencia, aviso en el panel de quien no está en el chat, historial tras recargar. | Pendiente |
| 13–15 | Seguridad y evidencias | Aislamiento entre GAD, prueba del último cupo, matriz de requisitos y pruebas, medición de rendimiento. | Pendiente |
| 15–20 | Preguntas | Todos. | Todos |

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

## 6. Commits auténticos y comprensión del código (criterio decidido; ⏳ plan)

- Cada integrante confirma con su propia cuenta los paquetes que revisó y entiende. **No se simula autoría ni actividad** (no se reparten commits artificialmente ni se alteran fechas).
- Cada paquete tiene un punto de revisión humana: quien lo confirma debe poder explicar qué hace, por qué y cómo se prueba.
- Reparto y responsables: pendiente de Q-03.

## 7. Contingencia (criterio decidido; ⏳ detalle)

| Fallo | Respuesta |
|---|---|
| PayPal Sandbox no responde | Continuar en local con el adaptador `fake`, **diciéndolo expresamente**, y mostrar la evidencia real de Sandbox obtenida antes (si existe). |
| El despliegue está dormido o caído | Demostración en local preparada de antemano. |
| Sin red | Local completo con Docker; el pago real no se muestra. |
| La cámara falla | Alternativa de pegar el código. |

Una demostración con el adaptador `fake` **no** es evidencia de integración con PayPal.

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
