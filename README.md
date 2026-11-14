# Turismo comunitario — preparación de la planificación

Proyecto académico que integra Aplicaciones Web Avanzadas y Desarrollo de Software Seguro.

## Archivos

- `PLAN.md`: copia sin modificaciones del plan original. Es la referencia de alcance, no una orden de ejecutar la implementación en esta etapa.
- `PROMPT-CLAUDE-PLANIFICACION.md`: prompt listo para pegar en Claude junto con `PLAN.md`.
- `docs/planificacion/`: destino propuesto para los documentos que produzca Claude. Todavía no se han generado.

## Cómo usarlo

1. Abre una conversación nueva en Claude y selecciona el modelo que tengas disponible para razonamiento y planificación extensa.
2. Adjunta `PLAN.md` y pega el contenido de `PROMPT-CLAUDE-PLANIFICACION.md`. En Claude Code, abre esta carpeta y pídele que lea ambos archivos; el prompt autoriza únicamente documentos de planificación.
3. Si tienes la guía de Web Avanzadas y la propuesta de Software Seguro, adjúntalas también. Las rutas y citas del plan original apuntan a archivos de otro equipo y no aportan su contenido.
4. Si la respuesta alcanza el límite de longitud, solicita continuar desde el último documento o apartado completo siguiendo el índice y las decisiones ya tomadas.
5. Revisa las decisiones y los pendientes antes de encargar código. Después, usa los prompts de implementación por paquete que genere Claude, en orden de dependencias.

No hace falta compartir credenciales ni información de personas reales. Las pruebas de PayPal Sandbox deberán ejecutarse y documentarse durante la implementación; esta preparación no acredita una integración probada.

## Lectura del plan original

El plan tiene una base sólida: monolito definido, flujo de compra grupal, versiones inmutables de ofertas, retención de cupos, pagos idempotentes, entradas individuales y pruebas de concurrencia.

La planificación ampliada debe resolver especialmente:

- Separación entre estados de oferta, versión, reserva, pago y entrada, incluyendo errores y operaciones concurrentes.
- Ubicación de transacciones, orden de bloqueos y recuperación cuando PayPal y PostgreSQL no pueden confirmar de forma atómica.
- Efecto de nuevas versiones sobre el inventario compartido y las reservas existentes.
- Política para dinero capturado sin posibilidad de emitir entradas, manteniendo los reembolsos fuera del MVP.
- Cierre de sesiones y conexiones WebSocket; límites de frecuencia y presencia con varias pestañas.
- Custodia y rotación de claves de cifrado de QR y minimización de datos de asistentes.
- Trazabilidad de ambas materias sin inventar requisitos de documentos que todavía no se han aportado.
- Paquetes pequeños con contratos, dependencias, pruebas y prompts que permitan retomar el trabajo en otra conversación de IA.

No se ha creado código de la aplicación ni se ha modificado el plan original.
