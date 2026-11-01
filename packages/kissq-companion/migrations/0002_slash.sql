-- Migration number: 0002 	 2026-11-01T07:43:42.468Z

ALTER TABLE questions ADD COLUMN correct_answerer TEXT DEFAULT NULL;
