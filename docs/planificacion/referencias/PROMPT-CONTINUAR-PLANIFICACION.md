# Continuar la planificación por documentos

## Inicio en PowerShell

Desde la carpeta del proyecto, iniciar una conversación nueva para no arrastrar todo el historial de investigación anterior:

```powershell
Set-Location -LiteralPath 'C:\Users\PERSONAL\Desktop\PERSONAL\Proyectos IA\proyectos\turismo-comunitario'
claude --model sonnet --effort high
```

El alias `sonnet` depende del proveedor. Comprueba el modelo efectivo con `/model`. No es necesario volver a Fable para desarrollar cada documento. Esta recomendación no garantiza una reducción específica en la cuota de una suscripción.

## Prompt inicial: completar el documento 03

```text
Estamos continuando una planificación existente, no iniciándola de nuevo.
Tu tarea en este turno es completar únicamente:
docs/planificacion/03-datos-estados-e-invariantes.md

Primero lee:
- docs/planificacion/referencias/PLAN.md, fuente del alcance.
- docs/planificacion/referencias/PROMPT-CLAUDE-PLANIFICACION.md, para conocer el detalle exigido al documento 03.
- docs/planificacion/00-indice-y-control.md, especialmente decisiones, preguntas,
  invariantes referenciados y punto de avance.
- El documento 03 completo.

Consulta después solo los apartados necesarios de 01, 02, 04, 05, 06, 08 y 10
para comprobar permisos, tipos, estados, transacciones, contratos y pruebas.
No leas ni reescribas documentos enteros sin necesidad.

Completa los pendientes de 03 con precisión suficiente para implementar:
1. Diagrama entidad-relación coherente con todas las entidades reales descritas.
2. Diccionario por campo: nombre, tipo PostgreSQL y representación en Prisma,
   nulabilidad, valor por defecto, validación, relaciones, índices y restricciones.
3. Tablas de transición: actor, disparador, origen/destino, precondiciones,
   cambios atómicos, efectos y comportamiento ante repetición o conflicto.
4. Restricciones y pseudocódigo/SQL documental que Prisma no exprese directamente,
   distinguiendo controles de base de datos, servicio y pruebas.
5. Política de eliminación, migraciones y semillas incrementales.

Conserva los IDs y decisiones justificadas. La base existente es una propuesta,
no una garantía de corrección: comprueba los detalles al ampliarlos. No fuerces
un número de entidades si el inventario real no coincide con el texto.

Comprueba especialmente pertenencia de los punteros de versión a la oferta,
inventario compartido, unicidad con nulos, relaciones cíclicas al insertar,
inmutabilidad de condiciones y consistencia entre pago, reserva y entradas.
No afirmes que un CHECK local puede validar otras filas o tablas; explica dónde
se garantiza realmente cada invariante y evita garantías superiores al mecanismo.

Si detectas una contradicción, corrígela en 03 y registra en 00 la decisión,
su razón y los documentos afectados. Si requiere cambiar alcance, deja la
decisión como propuesta pendiente, sin tratarla como aprobada. Puedes ajustar
referencias puntuales en documentos afectados; no desarrolles sus otros pendientes.

No repitas la investigación de versiones ni consultes fuentes por rutina.
Consulta documentación oficial cuando una duda concreta afecte la corrección;
registra lo verificado y no presentes fuentes anteriores como consultas de hoy.

No implementes la aplicación, no instales paquetes, no ejecutes migraciones
y no hagas operaciones destructivas. Solo edita documentación.
No inventes las guías académicas, personas, presupuesto o credenciales faltantes.
No uses subagentes ni tareas en segundo plano.

Guarda los avances por sección. Al terminar, revisa la coherencia de 03 con
sus dependencias y actualiza 00 §1 y §1.1 para que coincidan en estado,
fecha del punto de avance, pendientes reales y siguiente paso. Conserva las
fechas originales de consulta de fuentes. No declares revisión global realizada.

Si no puedes terminar en el turno, guarda lo escrito e indica el apartado exacto
pendiente. No reemplaces contenido detallado por resúmenes para aparentar cierre.

Finaliza con un informe breve: archivos modificados, apartados completados,
inconsistencias corregidas, pendientes y siguiente documento. Después detente.
No continúes automáticamente con 04.
```

## Prompt reutilizable para los siguientes documentos

Reemplaza NOMBRE-DEL-DOCUMENTO por el archivo exacto de la tabla inferior.

```text
Continúa la planificación existente. En este turno completa únicamente
docs/planificacion/NOMBRE-DEL-DOCUMENTO.

Lee el archivo completo, su especificación en docs/planificacion/referencias/PROMPT-CLAUDE-PLANIFICACION.md,
el alcance de docs/planificacion/referencias/PLAN.md y las decisiones y el punto de avance del índice 00.
Consulta solo los apartados necesarios de sus documentos dependientes.

Desarrolla todos sus pendientes con el nivel de detalle exigido. Conserva IDs,
contratos, alcance y decisiones justificadas. Verifica la base al ampliarla;
corrige incoherencias demostrables y registra los cambios en 00. Los cambios
de alcance quedan como propuestas pendientes. No reconstruyas lo ya terminado.

Si el documento tiene muchas fichas, casos o prompts, trabaja por lotes de
una fase o una sección coherente. Guarda cada lote y registra los IDs pendientes.
No copies plantillas vacías: cada ficha, prueba o prompt debe ser específico.

No repitas investigaciones de versiones salvo una duda que afecte la corrección.
Usa fuentes oficiales para esas dudas y distingue lo comprobado de lo supuesto.
No inventes requisitos de guías ausentes, evidencias ni pruebas ejecutadas.
Solo documentación: no implementes, instales o migres la aplicación.
No uses subagentes ni tareas en segundo plano.

Comprueba referencias y coherencia con los documentos relacionados. Actualiza
el estado del documento y 00 §1/§1.1 con pendientes, fecha de avance y siguiente
paso reales. Conserva las fechas originales de las consultas de fuentes.
Guarda los archivos y termina con un informe breve. Detente después de este
documento o del lote guardado; no avances automáticamente al siguiente.
```

## Orden y límites recomendados

| Archivo | Verificación principal / límite del lote |
|---|---|
| `03-datos-estados-e-invariantes.md` | Completar primero; cruzar el modelo con 04 y 05. |
| `04-reglas-transacciones-y-concurrencia.md` | Desarrollar primero TX-05 y TX-09; después el resto por grupos. No mantener transacciones abiertas durante llamadas de red. |
| `05-contratos-http-websocket-y-pagos.md` | Alinear entradas, salidas, estados y errores con 03/04; separar contratos HTTP y WebSocket si el turno resulta largo. |
| `06-seguridad-y-privacidad.md` | Controles comprobables y riesgos residuales. El mapeo Common Criteria sigue bloqueado hasta recibir sus objetivos. |
| `07-pantallas-y-experiencia.md` | Estados por pantalla y permisos según 01/05; consulta e ingreso de QR separados. |
| `08-pruebas-y-evidencias.md` | Un área funcional por lote, con preparación, pasos y aserciones reales para cada ID. Conservar catálogo sin simular ejecución. |
| `09-entorno-despliegue-y-operacion.md` | Procedimientos reproducibles, servicios y secretos; no asumir presupuesto ni hosting aprobados. |
| `10-fases-y-paquetes-implementables.md` | Una fase por lote; ficha completa de 13 puntos para cada paquete del inventario existente. |
| `11-prompts-para-la-ia-implementadora.md` | Una fase por lote, solo después de completar sus fichas de 10. Correspondencia uno a uno de IDs y criterios. |
| `12-demo-y-entrega-academica.md` | Recorridos, tiempos y evidencias; personas y requisitos externos no aportados permanecen pendientes. |

No hay que abrir una conversación nueva por cada lote. Si la conversación acumula demasiado contexto ajeno al documento actual, inicia otra con este prompt y el estado guardado; los archivos deben bastar para continuar.

## Revisión final independiente

Solo cuando se hayan completado los documentos anteriores:

```text
Revisa de forma independiente la planificación en docs/planificacion/ contra
docs/planificacion/referencias/PLAN.md y el encargo original. No implementes nada.

Verifica trazabilidad requisito → paquete → prueba → prompt; coincidencia de IDs,
estados y contratos; permisos por recurso; concurrencia de cupos y pagos;
emisión/consumo único de entradas; revocación de sesiones HTTP/WebSocket;
prerrequisitos entre fases y recuperación ante fallos externos.

Busca contradicciones concretas, no mejoras cosméticas ni nuevas funcionalidades.
Corrige las demostrables, registra su razón y el impacto y conserva explícitos
los pendientes externos. No declares verificaciones de código o Sandbox que no
existen. Actualiza 00 §12 con lo realmente revisado y sus límites, y §1/§1.1
con el progreso real. Guarda y detente.
```

Sonnet puede realizar esta revisión. Si se reserva una revisión con un modelo de mayor capacidad, concentrarla en 03, 04, 05, 06 y su consistencia con 08/10/11, en lugar de repetir toda la redacción. Ningún modelo elimina la necesidad de comprobar las decisiones críticas.
