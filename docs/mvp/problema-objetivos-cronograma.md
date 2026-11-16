# Problema, objetivos, cronograma y roles del MVP

Este documento define el planteamiento del primer bimestre para una PYME ecuatoriana ficticia de turismo comunitario. El equipo desarrollará un monolito web con cuentas, ofertas, catálogo y chat. Las fechas y parte de la identificación del equipo siguen pendientes; por ello, el cronograma usa días hábiles relativos y responsables numerados.

## PYME y problema

La PYME ficticia coordina experiencias de turismo comunitario en distintas provincias del Ecuador. Necesita registrar la información y fotografía de cada experiencia, publicarla y atender consultas. En esta entrega, la disponibilidad se consulta por WhatsApp; la aplicación no registra reservas ni pagos.

Actualmente, las ofertas y la comunicación están dispersas entre mensajes y documentos. Esto dificulta reconocer la información vigente, encontrar experiencias por provincia, controlar quién modifica cada oferta y conservar las conversaciones. Los visitantes también dependen de información enviada manualmente, sin un catálogo centralizado.

Centralizarlas permitirá mantener ofertas vigentes en un solo lugar y conversar mediante un canal autenticado con historial. Los visitantes tendrán un catálogo uniforme con fotografía y contacto por WhatsApp. Este alcance permite demostrar, probar y defender el recorrido completo durante el primer bimestre.

## Objetivo general

Desarrollar y validar durante el primer bimestre una aplicación web monolítica para centralizar las cuentas, las ofertas turísticas y la comunicación en tiempo real de una PYME ecuatoriana ficticia de turismo comunitario, utilizando Node.js, Express, EJS, Socket.IO y SQLite.

## Objetivos específicos

1. Implementar registro, sesión y recuperación de contraseña con validación, Argon2id y las pruebas automatizadas `TM-CTA-*`.
2. Implementar el CRUD de ofertas con seis atributos, fotografía, publicación, filtro por provincia, páginas de diez elementos y confirmación de eliminación; verificarlo con `TM-OFE-*` y `TM-NAV-*`.
3. Mostrar solo ofertas futuras, publicadas y con fotografía, y generar la consulta por WhatsApp cuando exista un número configurado; comprobarlo con `TM-OFE-17` y B2.2.
4. Lograr que dos usuarios autenticados intercambien mensajes persistentes, recuperen el historial, vean la presencia y reciban avisos sin recargar; verificarlo con `TM-WS-*`, `TM-CHAT-*` y `TM-NOT-*`.
5. Persistir siete tablas de aplicación mediante migraciones, ejecutar las pruebas del MVP y medir el listado con 20 000 ofertas, registrando resultados reales en B2.3 y B3.2.

## Cronograma relativo

Las fechas están **por fijar** porque la guía no indica la entrega (`PM-01`). Los intervalos son días hábiles orientativos desde el inicio; cada bloque comienza al integrar sus prerrequisitos.

| Fase e intervalo | Resultado esperado | Bloques y responsables |
|---|---|---|
| F0 · Base común ejecutable · días 1 a 3 | Proyecto instalable y ejecutable, contratos comunes, esquema, arnés de pruebas y documentos iniciales. | B0.1 I4; B0.2 I4; B0.3 I1; B0.4 I4; B0.5 I3; B0.6 I3; B0.7 I2. |
| F1 · Módulos en paralelo · días 3 a 8 | Cuentas, CRUD y catálogo de ofertas, panel, chat, presencia, aviso y despliegue integrados. | B1.1 I1; B1.2 I1; B1.3 I1; B1.4 I2; B1.5 I2; B1.6 I3; B1.7 I3; B1.8 I3; B1.9 I4; B1.10 I4; B1.11 I2. |
| F2 · Integración y evidencias · días 8 a 11 | Recorrido completo, datos de demostración y evidencias de rendimiento y seguridad. | B2.1 I1; B2.2 I4; B2.3 I2; B2.4 I3. |
| F3 · Entrega y demostración · días 11 a 13 | Documentación final, arquitectura, presentación, ensayo, repositorio y entrega cerrados. | B3.1 I4; B3.2 I2; B3.3 I1; B3.4 I3; B3.5 I4. |

## Equipo y roles

Los nombres deben confirmarse antes de B3.3 (`PM-08`). Se conserva la numeración para no atribuir identidades sin confirmación; el Integrante 3 se identifica como Alexis en esta rama.

| Integrante | Rol principal | Responsabilidades asignadas |
|---|---|---|
| Integrante 1 · nombre por confirmar | Cuentas, sesión y documentación final | Núcleo de validación; registro, ingreso, cierre y recuperación; integración de sesión HTTP y WebSocket; README, uso de IA y revisión final del repositorio. |
| Integrante 2 · nombre por confirmar | Ofertas, rendimiento y despliegue | Historias de usuario; reglas y pantallas del CRUD; despliegue HTTPS/WSS; medición de rendimiento; matriz final de historias y pruebas. |
| Integrante 3 · Alexis | Tiempo real, seguridad y presentación | Planteamiento y cronograma; arnés de pruebas; gateway, chat, historial y presencia; pruebas de seguridad; presentación y guion de demostración. |
| Integrante 4 · nombre por confirmar | Infraestructura, panel e integración | Servidor base, SQLite y núcleo web; panel y aviso de mensajes; integración del recorrido; diagrama de arquitectura; ensayo y cierre de entrega. |

## Alcance excluido

Esta entrega no incluye registro interno de reservas, pagos, entradas QR, control de ingreso, revisión de ofertas ni roles de GAD, operador o administrador. El cupo es referencial y la PYME confirma cualquier disponibilidad mediante la conversación de WhatsApp iniciada por el visitante.

## Pendientes y revisión

- `PM-01`: confirmar la fecha de entrega para convertir el cronograma relativo en fechas calendario.
- `PM-08`: confirmar los nombres reales de los integrantes 1, 2 y 4 y validar el nombre registrado para el Integrante 3.
- `TM-DOC-01`: el Integrante 1 debe revisar que el problema, la justificación, los objetivos medibles, el cronograma, los responsables y los cuatro roles sean coherentes con `PLAN-MVP.md`.
