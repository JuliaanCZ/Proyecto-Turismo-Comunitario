-- 001 · Base (Integrante 4). Control de migraciones.
-- El migrador (src/shared/migrate.js) ejecuta cada archivo dentro de su propia
-- transacción: aquí no van BEGIN, COMMIT ni PRAGMA.
-- Tiempos: INTEGER en milisegundos UTC (C-DAT, DM-10).

CREATE TABLE schema_migrations (
  version    TEXT    NOT NULL PRIMARY KEY
             CHECK (length(version) BETWEEN 1 AND 100),
  checksum   TEXT    NOT NULL
             CHECK (length(checksum) = 64 AND checksum NOT GLOB '*[^0-9a-f]*'),
  applied_at INTEGER NOT NULL
) STRICT;
