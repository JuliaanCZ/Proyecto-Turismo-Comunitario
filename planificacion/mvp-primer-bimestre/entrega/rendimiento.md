# Medición del listado paginado

**18 de noviembre de 2026.** Se midió la consulta real del listado de ofertas propias, filtrado por propietario y provincia, sobre PostgreSQL de Supabase desde Node.js en Windows. Se reutilizó `privateListSql(true)` con límite 10 y desplazamiento 0. La base de desarrollo tenía 4 ofertas y el filtro devolvió 1 fila. La transacción se ejecutó en modo de solo lectura.

Tras 5 consultas de calentamiento se tomaron 30 muestras secuenciales sobre la misma conexión. El tiempo del cliente incluye el viaje de ida y vuelta a la base, la ejecución y la lectura de la respuesta.

| Métrica | Resultado |
| --- | ---: |
| Mínimo | 147,98 ms |
| Mediana | 148,24 ms |
| p95 | 148,95 ms |
| Máximo | 149,23 ms |
| Tiempo de ejecución reportado por `EXPLAIN ANALYZE` | 4,51 ms |

El plan de consulta utilizó `idx_offers_owner_province_starts` en las ofertas y `offer_photos_pkey` al resolver la foto principal. El conjunto de cuatro ofertas sirve para comprobar la consulta y sus índices. Para evaluar carga o tiempos de página hay que medir con otro volumen y por HTTP.

Para repetir la medición, ejecuta la función [`privateListSql`](../../../src/modules/offers/data/offers.repo.js) contra la base de desarrollo con los parámetros `[ownerId, provincia, 10, 0]`. Ejecuta `EXPLAIN (ANALYZE, FORMAT JSON)` con esos parámetros, descarta las primeras cinco ejecuciones y calcula la mediana y el p95 de las siguientes 30 con `performance.now()`.
