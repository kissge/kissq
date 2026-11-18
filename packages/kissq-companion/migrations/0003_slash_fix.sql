-- Migration number: 0003 	 2026-11-18T04:05:55.363Z
ALTER TABLE questions DROP COLUMN slash_offset;
ALTER TABLE questions
ADD COLUMN slash_offset INTEGER DEFAULT NULL;
