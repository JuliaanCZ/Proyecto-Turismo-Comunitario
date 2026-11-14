# 11 — Prompts para la IA implementadora

> **ESTADO: PARCIAL — punto de avance guardado el 2026-11-12.**
> Contiene el **prompt maestro**, la **plantilla de informe** y el formato de **`ESTADO-IMPLEMENTACION.md`**, ya utilizables. Faltan los 38 prompts específicos por paquete (⏳), que dependen de las fichas del documento 10.
> **Siguiente paso exacto:** §4 — prompt del paquete `P0-01`, y continuar en orden de identificador.

---

## 1. Cómo usar este documento

1. Elegir el siguiente paquete cuyo estado en `ESTADO-IMPLEMENTACION.md` tenga todas sus dependencias «probadas» (grafo en [10 §4](10-fases-y-paquetes-implementables.md)).
2. Abrir una conversación nueva con la IA en la carpeta del repositorio.
3. Pegar el **prompt maestro** (§2) seguido del **prompt del paquete** (§4).
4. Revisar el informe final (§3), el código y las pruebas; hacer la revisión humana indicada en la ficha.
5. Confirmar el cambio con un commit propio del integrante responsable.

## 2. Prompt maestro (reutilizable)

```text
Vas a implementar UN paquete de un proyecto ya planificado. Trabaja como ingeniero de software
cuidadoso: el diseño está decidido y tu tarea es ejecutarlo, no rediseñarlo.

ANTES DE ESCRIBIR CÓDIGO
1. Lee docs/planificacion/00-indice-y-control.md (registro de decisiones, supuestos y hallazgos).
2. Lee ESTADO-IMPLEMENTACION.md y cualquier archivo de instrucciones locales (AGENTS.md, CLAUDE.md,
   README.md).
3. Inspecciona el repositorio real: estructura, package.json, migraciones, pruebas existentes y
   git status. No supongas que algo existe: compruébalo.
4. Lee la ficha del paquete en docs/planificacion/10-fases-y-paquetes-implementables.md y los
   apartados de los documentos 02 a 09 que esa ficha cite.
5. Comprueba que las dependencias del paquete están implementadas y probadas. Si alguna falta o
   está rota, DETENTE: describe el bloqueo y lo que sí verificaste. No improvises una
   implementación incompatible.

MIENTRAS IMPLEMENTAS
- Implementa solo el paquete solicitado. No amplíes el alcance ni adelantes otros paquetes.
- Respeta nombres de entidades, estados, eventos, rutas y códigos de error de la planificación.
- Las reglas de negocio viven en src/modules/*/application. Los adaptadores (src/app,
  src/realtime, src/jobs) no deciden nada.
- Versiones: usa las fijadas en docs/planificacion/02 §5. Prisma debe ser 7.10.1 exacta.
  Consulta la documentación de la versión INSTALADA antes de usar una API; si la API real
  difiere de lo planificado, adáptate y regístralo como decisión nueva.
- Seguridad: valida en servidor sesión, origen, datos y permisos en cada mutación. Nunca
  registres contraseñas, tokens, códigos QR ni credenciales. Nunca pongas secretos en el
  repositorio; usa .env (no versionado) y actualiza .env.example con valores ficticios.
- No ejecutes operaciones destructivas (borrar bases, reiniciar migraciones, reescribir
  historial de Git, borrar archivos ajenos al paquete) sin autorización explícita.
- Escribe las pruebas indicadas por identificador (T-...) junto con el código.

ANTES DE TERMINAR
- Ejecuta los comandos de verificación de la ficha y los pertinentes del proyecto (análisis,
  tipos, pruebas). Informa los resultados REALES, con la salida relevante. Si algo falla y no
  puedes resolverlo, dilo: no ocultes fallos ni marques como hecho lo que no pasó.
- No inventes resultados, cifras de rendimiento, capturas ni evidencias.
- Si una decisión de la planificación tuvo que cambiar, actualiza el documento correspondiente
  en docs/planificacion/ y la fila de decisiones del índice, explicando la razón.
- Actualiza README.md (comandos nuevos) y ESTADO-IMPLEMENTACION.md.
- Entrega el informe final con la plantilla indicada.
- No hagas commit ni push salvo que se te pida; propón el mensaje de commit.

PAQUETE A IMPLEMENTAR:
<pegar aquí el prompt del paquete>
```

## 3. Plantilla de informe al terminar

```markdown
# Informe del paquete <ID> — <título>

## Resultado
<Completado | Completado con pendientes | Bloqueado> — una frase.

## Archivos creados o modificados
| Archivo | Cambio |

## Migraciones
<nombre de cada migración y qué crea; SQL manual añadido> | Ninguna

## Comandos ejecutados y resultados reales
| Comando | Resultado (pasó / falló) | Salida relevante |

## Pruebas
| Identificador | Estado (pasa / falla / no escrita) | Observación |

## Verificaciones pendientes
<lo que no pudo ejecutarse y por qué; pasos manuales para el equipo>

## Decisiones nuevas o cambiadas
<identificador, qué cambió, por qué, documentos actualizados> | Ninguna

## Riesgos y deuda detectados

## Variables de entorno o servicios nuevos

## Mensaje de commit propuesto

## Siguiente paquete habilitado y contexto de traspaso
<qué debe saber la siguiente sesión que no esté ya en la documentación>
```

## 4. Prompts por paquete

⏳ **Por desarrollar: 38 prompts** (`P0-01` a `PE-05`). Cada uno tendrá la misma estructura:

```text
PAQUETE <ID> — <título>
Objetivo observable: …
Requisitos que satisface: …
Dependencias que deben estar probadas: …
Lee antes: <documentos y apartados concretos>; decisiones <D-nn>.
Alcance exacto: <qué sí> / Fuera de este paquete: <qué no>.
Cambios esperados: <archivos o módulos y responsabilidad>.
Contratos que introduces: … / Contratos que debes conservar: …
Reglas que no puedes romper: <invariantes INV-nn>.
Pruebas que debes escribir y hacer pasar: <T-...>.
Verificación: <comandos>.
Terminas cuando: <criterio de finalización>.
Si quedas a medias: <cómo dejar el repositorio>.
```

## 5. Formato propuesto de `ESTADO-IMPLEMENTACION.md`

Archivo en la raíz del repositorio, creado en P0-01 y actualizado al final de cada paquete. Separa cuatro niveles que no deben confundirse:

- **Diseñado:** existe en `docs/planificacion/`.
- **Implementado:** el código existe en el repositorio.
- **Probado:** sus pruebas automatizadas pasan (con fecha y comando).
- **Demostrado:** se mostró funcionando en el entorno indicado (local, despliegue, Sandbox real).

```markdown
# Estado de implementación

Última actualización: <fecha> — <quién o qué sesión>

## Resumen
- Fase actual: <n>
- Último paquete completado: <ID>
- Siguiente paquete: <ID>
- Bloqueos: <lista o «ninguno»>

## Paquetes
| ID | Diseñado | Implementado | Probado | Demostrado | Fecha | Commit | Notas |
|---|---|---|---|---|---|---|---|
| P0-01 | sí | no | no | no | — | — | — |

## Pruebas
| Identificador | Estado | Última ejecución | Comando |

## Verificaciones manuales pendientes
| Qué | Depende de | Estado |
| PayPal Sandbox real (T-PAG-24) | Credenciales (Q-08) | Pendiente |

## Decisiones cambiadas durante la implementación
| Decisión | Cambio | Razón | Documento actualizado |

## Entorno conocido
- Versiones instaladas reales: <node, next, prisma, …>
- Servicios externos configurados: <ninguno | Sandbox | alojamiento>

## Contexto para la siguiente sesión
<lo imprescindible que no esté en la documentación>
```
