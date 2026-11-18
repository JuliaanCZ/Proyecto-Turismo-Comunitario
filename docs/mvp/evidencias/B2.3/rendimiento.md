# B2.3 — Medición de rendimiento del listado filtrado

## Identificación

| Campo | Valor |
|---|---|
| Estado | `EJECUTADO` |
| Fecha UTC | 2026-11-18 02:05 |
| Rama | `bloque/B2.3-medicion` |
| Base medida | `77c8bc9e777c173ab207413088f7b2e9ada1f70a` más los cambios B2.3 todavía sin commit |
| Persona que ejecutó | Alexis, Integrante 3, en cobertura temporal del Integrante 2 |
| Repetición por otra persona | Pendiente del revisor (Integrante 4) |

## Decisión de volumen

El equipo acordó el 2026-11-17 reducir de 20 000 a **20 ofertas ficticias** porque la guía exige una medición, pero no fija un volumen. La decisión se registra como DM-17. La semilla coloca una oferta en cada una de 20 provincias; cuatro provincias quedan sin filas.

Este volumen permite demostrar que el procedimiento es reproducible, que la ruta real se mide y que `EXPLAIN QUERY PLAN` cambia al retirar el índice. **No permite inferir escalabilidad, rendimiento con carga de datos ni el coste de una paginación realmente profunda.**

## Entorno

| Campo | Valor real |
|---|---|
| CPU | 12th Gen Intel(R) Core(TM) i7-12700H, 20 procesadores lógicos |
| Memoria informada por Node | 16849752064 bytes |
| Sistema operativo | Windows `10.0.26200` (`win32`) |
| Node | `v24.22.3` |
| npm | `11.19.1` |
| SQLite | `3.54.1` mediante `node:sqlite` |
| Ejecución | `NODE_ENV=production`, servidor y cliente en la misma máquina |

## Datos y parámetros comprobados

| Campo | Valor real |
|---|---|
| Base aislada | `data/perf.sqlite` |
| Ofertas | 20 |
| Provincias con filas | 20 de 24 |
| Distribución | 1 oferta en cada provincia poblada |
| Usuario | `perf@demo.test` |
| Calentamiento descartado | 50 peticiones por ruta y variante |
| Muestras | 1000 por repetición |
| Concurrencia | 10 |
| Repeticiones | 3 por ruta y variante |
| Página filtrada | `/panel/ofertas?provincia=PICHINCHA&pagina=1` |
| Página final sin filtro | `/panel/ofertas?pagina=2` |

## Resultados HTTP reales

### Con índice

| Ruta | Rep. | Mediana ms | p95 ms | Mín. ms | Máx. ms | Errores |
|---|---:|---:|---:|---:|---:|---:|
| Pichincha, página 1 | 1 | 8.847400000000107 | 12.874199999999973 | 6.667100000000119 | 15.814099999999826 | 0 |
| Pichincha, página 1 | 2 | 6.9996000000001 | 10.595000000000027 | 6.408799999999701 | 15.478700000000117 | 0 |
| Pichincha, página 1 | 3 | 7.132999999999811 | 9.47569999999996 | 6.337799999999788 | 15.96770000000015 | 0 |
| Sin filtro, página 2 | 1 | 7.745400000000245 | 9.28819999999996 | 7.123500000000149 | 19.93190000000004 | 0 |
| Sin filtro, página 2 | 2 | 7.786200000000463 | 10.11409999999978 | 6.710399999999936 | 17.348899999999958 | 0 |
| Sin filtro, página 2 | 3 | 7.694599999999809 | 11.526499999999942 | 7.078499999999622 | 26.51800000000003 | 0 |

### Sin índice compuesto

| Ruta | Rep. | Mediana ms | p95 ms | Mín. ms | Máx. ms | Errores |
|---|---:|---:|---:|---:|---:|---:|
| Pichincha, página 1 | 1 | 8.870599999999968 | 12.486899999999991 | 6.621200000000044 | 14.738200000000006 | 0 |
| Pichincha, página 1 | 2 | 6.742799999999988 | 9.516199999999799 | 6.116899999999987 | 13.185899999999947 | 0 |
| Pichincha, página 1 | 3 | 6.914900000000216 | 8.084499999999935 | 6.249700000000303 | 15.849999999999909 | 0 |
| Sin filtro, página 2 | 1 | 7.8168000000000575 | 10.947700000000168 | 7.133299999999963 | 21.554599999999937 | 0 |
| Sin filtro, página 2 | 2 | 7.5844999999999345 | 11.412600000000111 | 7.016899999999623 | 21.299199999999928 | 0 |
| Sin filtro, página 2 | 3 | 7.534599999999955 | 9.710700000000543 | 6.926099999999678 | 18.443499999999403 | 0 |

Las seis repeticiones de cada variante terminaron sin errores. Con 20 filas, las diferencias HTTP son pequeñas y no muestran una ventaja estable del índice; corresponden al ruido normal de una medición local.

## Consulta SQL y plan

| Variante | Mediana ms | p95 ms | Mín. ms | Máx. ms | Plan principal |
|---|---:|---:|---:|---:|---|
| Con índice | 0.0239000000001397 | 0.026799999999639113 | 0.023299999999835563 | 0.09460000000035507 | `SEARCH o USING INDEX idx_offers_owner_province_starts (owner_id=? AND province=?)` |
| Sin índice compuesto | 0.024800000000141154 | 0.028200000000651926 | 0.024099999999634747 | 0.10760000000027503 | `SEARCH o USING INDEX idx_offers_owner_starts (owner_id=?)` |

El plan con índice cumple el criterio técnico: usa `idx_offers_owner_province_starts`. Al retirarlo en una copia temporal, SQLite recurre a `idx_offers_owner_starts` y filtra la provincia después.

## Lectura y limitaciones

- El p95 HTTP observado quedó muy por debajo del objetivo propuesto de 300 ms y la consulta quedó debajo de 20 ms en este equipo.
- Esos objetivos no son umbrales oficiales y el volumen de 20 filas no permite generalizar el resultado.
- Servidor, cliente y SQLite corrieron en la misma máquina, con caché caliente después del calentamiento.
- La página 2 usa `OFFSET 10`; no existe una página suficientemente profunda para estudiar crecimiento por desplazamiento.
- Los datos son sintéticos y uniformes. La variante sin índice se ejecutó sobre una copia temporal y no alteró `data/perf.sqlite`.

## Reproducción

```powershell
npm run perf:seed
npm run perf:catalog
npm run perf:catalog -- --sin-indice
node --test tests/integration/rendimiento-datos.test.js
```

Salidas literales: `sembrado.txt`, `catalogo-con-indice.txt` y `catalogo-sin-indice.txt`. Para cerrar completamente el criterio del bloque, el Integrante 4 debe repetir los comandos en su equipo y añadir el resultado de su repetición.
