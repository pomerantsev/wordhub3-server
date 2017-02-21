BEGIN;

DELETE FROM repetitions
  WHERE flashcard_id NOT IN (SELECT id FROM flashcards);

ALTER TABLE users
  DROP COLUMN is_admin;

UPDATE users
  SET salt = ''
  WHERE salt IS NULL;

ALTER TABLE flashcards
  ADD COLUMN uuid text;

UPDATE flashcards
  SET uuid = id;

ALTER TABLE flashcards
  DROP COLUMN id,
  DROP COLUMN consecutive_successful_repetitions,
  DROP COLUMN learned_on;

ALTER TABLE repetitions
  ADD COLUMN uuid text,
  ADD COLUMN flashcard_uuid text,
  ADD COLUMN planned_day integer,
  ADD COLUMN seq integer;

UPDATE repetitions
  SET uuid = id,
    flashcard_uuid = flashcard_id,
    planned_day = DATE_PART('day', planned_date::timestamp - '2012-01-01'::timestamp),
    -- We will have to make sure in the client that large seq ids are handled correctly
    seq = id;

UPDATE repetitions
  SET successful = FALSE
  WHERE successful IS NULL;

ALTER TABLE repetitions
  DROP COLUMN id,
  DROP COLUMN flashcard_id,
  DROP COLUMN planned_date,
  DROP COLUMN run;

COMMIT;
