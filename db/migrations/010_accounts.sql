-- 010 · Cuentas (módulo accounts). Rango reservado: 010–019.
-- Tablas: users, sessions, password_reset_tokens, mail_outbox.
-- Tiempos: INTEGER en milisegundos UTC (C-DAT, DM-10).
-- length() de SQLite cuenta caracteres Unicode, no bytes (en TEXT).

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL
                CHECK (length(email) BETWEEN 3 AND 254 AND email = lower(email)),
  display_name  TEXT    NOT NULL
                CHECK (length(display_name) BETWEEN 2 AND 80),
  password_hash TEXT    NOT NULL
                CHECK (length(password_hash) > 0),
  created_at    INTEGER NOT NULL
) STRICT;

CREATE UNIQUE INDEX ux_users_email ON users (email);

CREATE TABLE sessions (
  id            TEXT    NOT NULL PRIMARY KEY
                CHECK (length(id) = 36),
  user_id       INTEGER NOT NULL
                REFERENCES users (id) ON DELETE CASCADE,
  token_hash    TEXT    NOT NULL
                CHECK (length(token_hash) = 64 AND token_hash NOT GLOB '*[^0-9a-f]*'),
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL,
  revoked_at    INTEGER,
  revoke_reason TEXT
                CHECK (revoke_reason IN ('LOGOUT', 'PASSWORD_RESET')),
  CHECK (expires_at > created_at),
  CHECK ((revoked_at IS NULL) = (revoke_reason IS NULL))
) STRICT;

CREATE UNIQUE INDEX ux_sessions_token_hash ON sessions (token_hash);
CREATE INDEX idx_sessions_user ON sessions (user_id);

CREATE TABLE password_reset_tokens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL
             REFERENCES users (id) ON DELETE CASCADE,
  token_hash TEXT    NOT NULL
             CHECK (length(token_hash) = 64 AND token_hash NOT GLOB '*[^0-9a-f]*'),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at    INTEGER,
  CHECK (expires_at > created_at)
) STRICT;

-- Un token por usuario: el servicio reemplaza la fila al solicitar otro.
CREATE UNIQUE INDEX ux_password_reset_tokens_user ON password_reset_tokens (user_id);
CREATE UNIQUE INDEX ux_password_reset_tokens_hash ON password_reset_tokens (token_hash);

-- Bandeja de pruebas (DM-15): sin SMTP.
CREATE TABLE mail_outbox (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email   TEXT    NOT NULL CHECK (length(to_email) BETWEEN 3 AND 254),
  subject    TEXT    NOT NULL CHECK (length(subject) > 0),
  body       TEXT    NOT NULL CHECK (length(body) > 0),
  created_at INTEGER NOT NULL
) STRICT;
