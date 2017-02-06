BEGIN;

TRUNCATE TABLE flashcards CASCADE;

ALTER TABLE repetitions
  DROP CONSTRAINT repetitions_flashcard_uuid_fkey,
  DROP COLUMN uuid,
  DROP COLUMN flashcard_uuid;

ALTER TABLE flashcards
  DROP COLUMN uuid,
  ADD COLUMN uuid uuid PRIMARY KEY;

ALTER TABLE repetitions
  ADD COLUMN uuid uuid PRIMARY KEY,
  ADD COLUMN flashcard_uuid uuid REFERENCES flashcards(uuid) ON DELETE CASCADE;

COMMIT;
