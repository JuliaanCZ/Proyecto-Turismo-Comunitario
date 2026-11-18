# Créditos de las imágenes de demostración

Las siete imágenes de esta carpeta son **ilustraciones vectoriales originales**, dibujadas a mano como
código SVG para este proyecto académico. No son fotografías, no copian obras de terceros y no contienen
personas, marcas ni texto. Autoría: equipo del proyecto «Turismo comunitario» (Aplicaciones Web
Avanzadas), publicadas junto al código del repositorio con su misma licencia. No requieren permisos
adicionales.

| Archivo | Se usa en la oferta | Texto alternativo guardado |
|---|---|---|
| `laguna-andina.svg` | Caminata guiada a la laguna comunitaria (Ana) | Ilustración de una laguna rodeada de montañas al atardecer |
| `cacao-fino.svg` | Recorrido por la ruta del cacao fino (Ana) | Ilustración de tres mazorcas de cacao colgando de sus ramas |
| `playa-manabi.svg` | Pesca artesanal al amanecer (Ana) | Ilustración de una playa con una palmera y un bote al amanecer |
| `selva-napo.svg` | Paseo en balsa por el río y la selva (Ana) | Ilustración de una balsa en un río rodeado de selva |
| `telar-imbabura.svg` | Visita al taller de telar y tintes naturales (Ana) | Ilustración de un tejido con rombos de colores |
| `cafe-altura.svg` | Ruta del café de altura (Luis) y borrador privado de Ana | Ilustración de laderas con cafetales y frutos rojos |
| `paramo-chimborazo.svg` | Amanecer en el páramo del volcán (Luis) | Ilustración de un volcán nevado sobre el páramo |

`scripts/seed-demo.js` convierte cada SVG a JPEG con `sharp` y lo guarda por el servicio
`offers.setOfferPhoto`, junto con el texto alternativo de la tabla.

## Cómo sustituirlas por fotografías propias o autorizadas

Si la demo en vivo usa fotografías reales (pendiente PM-12 de `PLAN-MVP.md`), reemplaza los archivos
conservando el nombre y la extensión `.svg` solo si siguen siendo SVG; para JPEG, PNG o WebP cambia
la extensión en `scripts/seed-demo.js` (tabla `DEMO_OFFERS`, campo `photo`). Anota aquí el autor, la
fuente y la autorización de cada foto nueva **antes** de sembrarla. No subas fotos de terceros sin
permiso escrito ni de personas identificables sin su consentimiento.
