-- 030 · Chat (módulo chat). Rango reservado: 030–039.
-- Tabla: chat_messages.
-- Tiempos: INTEGER en milisegundos UTC (C-DAT, DM-10).

CREATE TABLE chat_messages (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  room              TEXT    NOT NULL DEFAULT 'general'
                    CHECK (room = 'general'),
  author_id         INTEGER NOT NULL
                    REFERENCES users (id) ON DELETE RESTRICT,
  -- Copia del nombre al publicar (DM-14): chat no consulta users.
  author_name       TEXT    NOT NULL
                    CHECK (length(author_name) BETWEEN 2 AND 80),
  -- 1 a 500 caracteres y no solo espacios en blanco. trim() de SQLite solo quita
  -- los caracteres que se le indican, por eso se listan los espacios Unicode
  -- (White_Space de Unicode más U+FEFF, como String.prototype.trim de JavaScript).
  text              TEXT    NOT NULL
                    CHECK (
                      length(text) BETWEEN 1 AND 500
                      AND length(trim(text, char(
                        9, 10, 11, 12, 13, 32, 133, 160, 5760,
                        8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202,
                        8232, 8233, 8239, 8287, 12288, 65279
                      ))) > 0
                    ),
  client_message_id TEXT    NOT NULL
                    CHECK (length(client_message_id) BETWEEN 1 AND 64),
  created_at        INTEGER NOT NULL
) STRICT;

-- Idempotencia del envío: un reintento del mismo cliente no duplica el mensaje.
CREATE UNIQUE INDEX ux_chat_messages_author_client
  ON chat_messages (author_id, client_message_id);
-- Historial por sala con cursor (id).
CREATE INDEX idx_chat_room_id ON chat_messages (room, id);
