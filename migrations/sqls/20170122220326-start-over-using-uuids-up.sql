DROP TABLE events;

ALTER TABLE repetitions
  DROP CONSTRAINT IF EXISTS repetitions_flashcard_id_fkey;

TRUNCATE repetitions;

TRUNCATE flashcards;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE flashcards
  DROP COLUMN id,
  ADD COLUMN uuid uuid PRIMARY KEY,
  ADD COLUMN created_at timestamptz,
  ADD COLUMN updated_at timestamptz;

ALTER TABLE repetitions
  DROP CONSTRAINT IF EXISTS repetitions_flashcard_id_seq_key,
  DROP COLUMN id,
  DROP COLUMN flashcard_id,
  ADD COLUMN uuid uuid PRIMARY KEY,
  ADD COLUMN flashcard_uuid uuid REFERENCES flashcards(uuid),
  ADD CONSTRAINT repetitions_flashcard_uuid_seq_key UNIQUE (flashcard_uuid, seq),
  ADD COLUMN created_at timestamptz,
  ADD COLUMN updated_at timestamptz;
