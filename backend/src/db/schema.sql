CREATE TABLE IF NOT EXISTS users (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  email             TEXT    NOT NULL UNIQUE,
  role              TEXT    NOT NULL CHECK(role IN ('gestionnaire', 'lecteur', 'etudiant', 'entreprise')),
  entity_id         INTEGER,
  entra_tenant_id   TEXT,
  entra_object_id   TEXT,
  display_name      TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Les index d'unicite sur les nouvelles colonnes users (tid+oid, email
-- insensible a la casse) sont crees dans db.migrate.ts, apres l'ajout de
-- colonnes sur les bases existantes : schema.sql seul echouerait sur une
-- base ou ces colonnes n'existent pas encore (CREATE TABLE IF NOT EXISTS ne
-- les ajoute pas retroactivement).

-- Sessions Express persistees (jalon 2) : remplace le MemoryStore du pilote.
-- expires_at en epoch ms pour un filtrage numerique simple.
CREATE TABLE IF NOT EXISTS sessions (
  sid         TEXT    PRIMARY KEY,
  session     TEXT    NOT NULL,
  expires_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS students (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  matricule      TEXT    UNIQUE,
  first_name     TEXT    NOT NULL,
  last_name      TEXT    NOT NULL,
  email          TEXT    NOT NULL UNIQUE,
  date_naissance TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS companies (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  address       TEXT,
  general_email TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS company_contacts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id    INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name    TEXT    NOT NULL,
  last_name     TEXT    NOT NULL,
  email         TEXT    NOT NULL,
  phone         TEXT,
  roles         TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS offers (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id              INTEGER NOT NULL REFERENCES companies(id),
  priority_contact_id     INTEGER          REFERENCES company_contacts(id),
  description             TEXT    NOT NULL,
  location                TEXT,
  technologies            TEXT,
  objectives              TEXT,
  remote_allowed          INTEGER NOT NULL DEFAULT 0,
  remote_percentage       INTEGER,
  remarks                 TEXT,
  attachment_path         TEXT,
  status                  TEXT    NOT NULL DEFAULT 'soumise'
                            CHECK(status IN ('soumise', 'validee_et_visible', 'prise', 'non_disponible', 'refusee')),
  submitted_by_student_id INTEGER          REFERENCES students(id),
  created_by_company_id   INTEGER          REFERENCES companies(id),
  source_type             TEXT             CHECK(source_type IN ('company', 'student')),
  created_at              TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS offer_contacts (
  offer_id    INTEGER NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  contact_id  INTEGER NOT NULL REFERENCES company_contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (offer_id, contact_id)
);

CREATE TABLE IF NOT EXISTS applications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  offer_id    INTEGER NOT NULL REFERENCES offers(id),
  student_id  INTEGER NOT NULL REFERENCES students(id),
  selected    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (offer_id, student_id)
);

CREATE TABLE IF NOT EXISTS offer_status_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  offer_id    INTEGER NOT NULL REFERENCES offers(id),
  from_status TEXT,
  to_status   TEXT    NOT NULL,
  changed_by  TEXT,
  changed_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
