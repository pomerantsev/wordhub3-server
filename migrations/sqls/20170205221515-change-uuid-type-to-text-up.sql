-- This change is just for testing convenience: I'd like to be able
-- to have shorter ids, which is not possible if TYPE is uuid.
-- I'm not sure if the uuid type has any real performance benefits,
-- apart from occupying less space: http://stackoverflow.com/a/29882952

BEGIN;

ALTER TABLE repetitions
  DROP CONSTRAINT repetitions_flashcard_uuid_fkey,
  ALTER COLUMN uuid TYPE text,
  ALTER COLUMN flashcard_uuid TYPE text;

ALTER TABLE flashcards
  ALTER COLUMN uuid TYPE text;

ALTER TABLE repetitions
  ADD CONSTRAINT repetitions_flashcard_uuid_fkey
  FOREIGN KEY (flashcard_uuid)
  REFERENCES flashcards(uuid)
  ON DELETE CASCADE;

COMMIT;
