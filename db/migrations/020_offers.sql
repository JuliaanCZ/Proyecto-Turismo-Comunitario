-- 020 · Ofertas (módulo offers). Rango reservado: 020–029.
-- Tablas: offers, offer_photos.
-- Tiempos: INTEGER en milisegundos UTC (C-DAT, DM-10).
-- Las 24 provincias son los códigos de docs/planificacion/03 §3.0 (enum Province).

CREATE TABLE offers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id      INTEGER NOT NULL
                REFERENCES users (id) ON DELETE RESTRICT,
  title         TEXT    NOT NULL
                CHECK (length(title) BETWEEN 5 AND 120),
  description   TEXT    NOT NULL
                CHECK (length(description) BETWEEN 20 AND 2000),
  province      TEXT    NOT NULL
                CHECK (province IN (
                  'AZUAY', 'BOLIVAR', 'CANAR', 'CARCHI', 'CHIMBORAZO', 'COTOPAXI',
                  'EL_ORO', 'ESMERALDAS', 'GALAPAGOS', 'GUAYAS', 'IMBABURA', 'LOJA',
                  'LOS_RIOS', 'MANABI', 'MORONA_SANTIAGO', 'NAPO', 'ORELLANA', 'PASTAZA',
                  'PICHINCHA', 'SANTA_ELENA', 'SANTO_DOMINGO_DE_LOS_TSACHILAS',
                  'SUCUMBIOS', 'TUNGURAHUA', 'ZAMORA_CHINCHIPE'
                )),
  location_text TEXT    NOT NULL
                CHECK (length(location_text) BETWEEN 5 AND 200),
  starts_at     INTEGER NOT NULL,
  capacity      INTEGER NOT NULL
                CHECK (capacity BETWEEN 1 AND 1000),
  is_published  INTEGER NOT NULL DEFAULT 0
                CHECK (is_published IN (0, 1)),
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
) STRICT;

-- Panel: ofertas propias filtradas por provincia, por fecha de inicio.
CREATE INDEX idx_offers_owner_province_starts ON offers (owner_id, province, starts_at, id);
-- Panel: ofertas propias sin filtro, por fecha de inicio.
CREATE INDEX idx_offers_owner_starts ON offers (owner_id, starts_at, id);
-- Catálogo público: ofertas publicadas y futuras, por fecha de inicio.
CREATE INDEX idx_offers_public_starts ON offers (is_published, starts_at, id);

-- Una foto por oferta (la clave primaria es la clave foránea). El BLOB se guarda
-- aparte para que los listados lean solo metadatos.
CREATE TABLE offer_photos (
  offer_id     INTEGER NOT NULL PRIMARY KEY
               REFERENCES offers (id) ON DELETE CASCADE,
  content_type TEXT    NOT NULL
               CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  alt_text     TEXT    NOT NULL
               CHECK (length(alt_text) BETWEEN 1 AND 160),
  image_bytes  BLOB    NOT NULL
               CHECK (length(image_bytes) BETWEEN 1 AND 2097152)
) STRICT;
