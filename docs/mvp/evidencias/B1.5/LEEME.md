# Evidencia B1.5 — ofertas HTTP

Fecha local: 2026-11-17. Rama: `codex/B1.5-ofertas-http`, creada desde `main` en `7d30f22` (B1.4 integrado).

## Comprobaciones reales

- `npm ci`: pasó al repetirlo con el servidor temporal de capturas detenido; 202 paquetes instalados, 0 vulnerabilidades reportadas. El primer intento falló con `EPERM` porque ese servidor mantenía abierta `libvips-42.dll` de Sharp.
- `node --test tests/integration/ofertas-http.test.js`: 6/6 casos pasaron; salida en `pruebas-bloque.txt`. Cubren TM-OFE-09 a TM-OFE-17 mediante aserciones reales.
- `npm test`: 96/96 pasaron; salida en `npm-test.txt`.
- `npm run lint`: pasó; salida en `npm-lint.txt`.

## Capturas

Se usó un servidor local **temporal**, eliminado tras las capturas, con sesión simulada y datos ficticios en SQLite en memoria. Son vistas reales del router y las plantillas B1.5 en Edge 157 a 1280 × 900. No representan ingreso real (B1.2), despliegue público ni número comercial de WhatsApp.

- `lista-escritorio.png`: ofertas propias y filtro.
- `formulario-errores.png`: respuesta HTTP 422 con valor conservado y mensaje junto al título.
- `detalle.png`: detalle privado, foto y acciones.
- `confirmacion.png`: página de confirmación antes de eliminar.
- `catalogo.png` y `catalogo-detalle.png`: catálogo y detalle públicos sin sesión, con estado de contacto no disponible.

Pendiente de integración F2: repetir el ciclo con ingreso real en B2.2. No se verificó el diseño en un navegador móvil real.
