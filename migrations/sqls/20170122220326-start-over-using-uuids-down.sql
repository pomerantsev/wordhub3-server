BEGIN;

ALTER TABLE repetitions
  DROP CONSTRAINT repetitions_flashcard_uuid_fkey;

TRUNCATE repetitions;

TRUNCATE flashcards;

DROP EXTENSION IF EXISTS pgcrypto;

ALTER TABLE flashcards
  DROP COLUMN updated_at,
  DROP COLUMN created_at,
  DROP COLUMN uuid,
  ADD COLUMN id serial PRIMARY KEY;

ALTER TABLE repetitions
  DROP COLUMN updated_at,
  DROP COLUMN created_at,
  DROP CONSTRAINT repetitions_flashcard_uuid_seq_key,
  DROP COLUMN uuid,
  DROP COLUMN flashcard_uuid,
  ADD COLUMN id serial PRIMARY KEY,
  ADD COLUMN flashcard_id integer REFERENCES flashcards(id),
  ADD CONSTRAINT repetitions_flashcard_id_seq_key UNIQUE (flashcard_id, seq);

CREATE TABLE events (
  id serial PRIMARY KEY,
  type text NOT NULL,
  action text NOT NULL,
  updates jsonb
);

COMMIT;
