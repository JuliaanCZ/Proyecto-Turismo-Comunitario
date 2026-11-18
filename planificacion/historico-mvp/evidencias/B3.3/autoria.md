# Auditoría de autoría (B3.3)

**Fecha:** 2026-11-18 · **Base:** `main` en `5c617c4` (PR #24 integrado) · **Fuente:** `git log --all`, `git shortlog` y la lista pública de pull requests de GitHub (leída sin credenciales).

Por privacidad **no se imprimen los correos** de los integrantes (algunos son personales): se informa solo de los nombres de autor que ya muestra el historial y de cuántas direcciones distintas hay. `git shortlog -sne`, que el plan prevé, incluye los correos; la salida sin ellos está en [`autoria-shortlog.txt`](autoria-shortlog.txt). No se reescribió el historial ni se alteró ninguna fecha o autoría.

## Resultado

Los cuatro integrantes tienen commits propios en `main`. El historial va del 2026-11-14 al 2026-11-18.

| Integrante (inferido) | Usuario de GitHub | Commits propios sin fusiones | Commits de fusión (incluidas las que firma con su nombre de perfil) | Identidades de Git |
|---|---|---:|---:|---|
| Integrante 4 · Julián | `JuliaanCZ` | 23 (+1 de `juliaan-cz2004`, por confirmar) | 9 | `JuliaanCZ` con dos correos (uno personal y el `noreply` de GitHub); una tercera identidad, `juliaan-cz2004` (1 commit, el inicial de planificación), que **Julián debe confirmar como propia** |
| Integrante 1 | `Matian542` | 15 | 9 (3 + 6 con el nombre «Mateo Calvache») | `Matian542` con un correo institucional y otro `noreply`; el nombre «Mateo Calvache» aparece en 6 fusiones hechas desde la web de GitHub |
| Integrante 3 · Alexis | `alexisv-275` | 13 | 7 (1 + 6 con el nombre «Alexis») | `alexisv-275` con un correo personal y otro `noreply`; el nombre «Alexis» aparece en 6 fusiones |
| Integrante 2 | `Matein0411` | 7 | 8 (3 + 5 con el nombre «Mateo Yunga») | `Matein0411` con un correo personal y otro `noreply`; el nombre «Mateo Yunga» aparece en 5 fusiones |

Totales: 92 commits en el historial (59 sin fusiones y 33 de fusión; 24 fusiones de PR las firma «GitHub» como confirmador). Hay **nueve direcciones de correo distintas** y **ocho nombres de autor** (como autores) para cuatro personas, porque cada una commiteó desde más de una configuración. Esto no es un problema de autenticidad, pero conviene unificarlo hacia adelante (`git config user.name` y `user.email` por persona) o declarar un `.mailmap` sin tocar el pasado.

### Equilibrio

- Reparto de commits propios sin fusiones: Integrante 4, 24 (41 %); Integrante 1, 15 (25 %); Integrante 3, 13 (22 %); Integrante 2, 7 (12 %). La cifra del Integrante 2 es la más baja y se declara en el README tal cual.
- Por líneas añadidas en `main`, el Integrante 4 domina porque aporta la base, el diagrama y buena parte de los documentos; esa métrica no mide el esfuerzo y no se usa para corregir nada.
- Parte del trabajo se hizo con asistentes de IA y en sesiones compartidas; el registro está en [`../../ia.md`](../../ia.md).
- **Decisión pendiente del equipo:** si el reparto de commits debe equilibrarse con trabajo real adicional antes de la entrega. No se simulan commits ni se cambian autorías.

## Commits por bloque (sin fusiones)

Cada fila resume el rango de commits que trajo el PR a `main`. «Previsto» es el responsable de [`PLAN-MVP.md`](../../../mvp-primer-bimestre/PLAN-MVP.md) §3.5.

| PR | Rama | Previsto | Commits en el PR (usuario y cantidad) | Fechas | ¿Coincide con lo previsto? |
|---|---|---|---|---|---|
| #1 | B0.1-base | I4 | `JuliaanCZ` 3 | 2026-11-16 | Sí |
| #2 | B0.7-historias | I2 | `Matein0411` 1 | 2026-11-16 | Sí |
| #3 | B0.6-problemas | I3 | `alexisv-275` 1 | 2026-11-16 | Sí |
| #4 | B0.2-sqlite | I4 | `JuliaanCZ` 2 | 2026-11-16 | Sí |
| #5 | B0.3-validacion | I1 | `Matian542` 3 | 2026-11-16 | Sí |
| #6 | B0.4-nucleo-web | I4 | `JuliaanCZ` 1 | 2026-11-16 | Sí |
| #7 | B1.11-despliegue | I2 | `Matein0411` 2 | 2026-11-16 | Sí |
| #8 | B0.5-arnes | I3 | `alexisv-275` 3 | 2026-11-17 | Sí |
| #9 | B1.6-gatewaysocketio | I3 | `alexisv-275` 1 | 2026-11-17 | Sí |
| #10 | B1.9-panel | I4 | `JuliaanCZ` 2 | 2026-11-17 | Sí |
| #11 | codex/B1.4-ofertas | I2 | `Matein0411` 2 | 2026-11-17 | Sí |
| #12 | B1.1-registro | I1 | `Matian542` 3 | 2026-11-17 | Sí |
| #13 | B1.7-Chat | I3 | `alexisv-275` 2 | 2026-11-17 | Sí |
| #14 | B1.5-ofertas-http | I2 | `Matein0411` 2 | 2026-11-17 | Sí |
| #15 | B1.2-sesion | I1 | `Matian542` 1 | 2026-11-17 | Sí |
| #16 | B1.8-Usuarios-conectados | I3 | `alexisv-275` 2 | 2026-11-17 | Sí |
| #17 | B1.10-notificaciones | I4 | `JuliaanCZ` 3 | 2026-11-17 | Sí |
| #18 | B1.3-recuperacion | I1 | `Matian542` 1 | 2026-11-17 | Sí |
| #19 | B2.3-medicion | I2 | `alexisv-275` 2 | 2026-11-17 | **No**: lo firmó el Integrante 3 |
| #20 | B2.1-sesion-http-ws | I1 | `Matian542` 4 | 2026-11-17 | Sí |
| #21 | B2.4-Seguridad | I3 | `alexisv-275` 2 | 2026-11-17 | Sí |
| #22 | B2.2-integracion-demo | I4 | `JuliaanCZ` 2 | 2026-11-17 | Sí |
| #23 | B3.1-arquitectura | I4 | `JuliaanCZ` 1 | 2026-11-17 | Sí |
| #24 | B3.2-trazabilidad | I2 | `Matian542` 3 | 2026-11-17 a 2026-11-18 | **No**: lo firmó el Integrante 1 |

Los 49 commits de estos rangos más 10 commits de planificación anteriores al primer PR (el commit inicial y nueve `docs:` hasta `56a790a`, todos de la identidad de Julián) suman los 59 commits sin fusiones. La asignación de usuarios a «Integrante n» es una **inferencia** a partir de esta coincidencia entre bloques y firmantes (`PM-08`: confirmar nombres reales).

### B3.3 (este bloque)

Responsable previsto: Integrante 1. **Lo asume Julián** (`JuliaanCZ`, Integrante 4 por la inferencia anterior), a petición suya, en sustitución del Integrante 1. Se conserva su identidad real y su autoría: no se le registra como revisor de su propio trabajo. El revisor previsto era el Integrante 4, es decir, el propio Julián; por eso **la revisión independiente la debe hacer otra persona** y queda pendiente.

## Diferencias entre nombres que el equipo debe resolver (PM-08)

- La evidencia de B3.1 nombra al revisor del PR #23 con un nombre distinto del que muestra Git para `Matian542` («Mateo Calvache» en las fusiones). Conviene confirmar el nombre real y escribirlo igual en README, `problema-objetivos-cronograma.md` y las evidencias.
- Los nombres reales de los Integrantes 1, 2 y 4 siguen sin confirmar en el plan (solo el Integrante 3 figura como Alexis). El README usa la numeración y los usuarios de GitHub, y llama «Julián» al Integrante 4 porque así consta en `demo.md`.
- `demo.md` (§6) registra el ensayo humano de Julián como «Integrante 4», coherente con la inferencia anterior.

## Cómo repetirlo

```bash
git shortlog -sn --all
git log --all --format='%an' | sort | uniq -c | sort -rn
git log --all --no-merges --format='%an' | sort | uniq -c | sort -rn
git log --all --format='%ae' | sort -u | wc -l     # solo cuenta; no imprimas las direcciones
```
