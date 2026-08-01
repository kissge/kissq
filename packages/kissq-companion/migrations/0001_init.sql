-- Migration number: 0001 	 2026-07-30T10:03:25.929Z
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS likes;

CREATE TABLE IF NOT EXISTS questions (
  id         INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  shown      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, session_id)
);

CREATE TABLE IF NOT EXISTS likes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  session_id  TEXT NOT NULL,
  user_name   TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id, session_id) REFERENCES questions(id, session_id) ON DELETE CASCADE
);

CREATE INDEX index_session_id_shown ON questions(session_id, shown);
CREATE INDEX index_session_id ON questions(session_id);
CREATE INDEX index_question_id ON likes(question_id);
