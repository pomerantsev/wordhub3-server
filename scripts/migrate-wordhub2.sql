BEGIN;

DELETE FROM repetitions
  WHERE flashcard_id NOT IN (SELECT id FROM flashcards);

ALTER TABLE users
  DROP COLUMN is_admin;

UPDATE users
  SET salt = ''
  WHERE salt IS NULL;

ALTER TABLE flashcards
  ADD COLUMN uuid text,
  ADD COLUMN creation_date text,
  ADD COLUMN creation_day integer;

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
    planned_day = DATE_PART('day', actual_date::timestamp - '2012-01-01'::timestamp),
    -- We will have to make sure in the client that large seq ids are handled correctly
    seq = id;

UPDATE flashcards AS f
  SET
    creation_date = to_char(f.created_at, 'YYYY-MM-DD'),
    creation_day =
      (SELECT planned_day FROM repetitions AS r WHERE r.flashcard_uuid = f.uuid ORDER BY r.created_at LIMIT 1) -
        DATE_PART(
          'day',
          (SELECT planned_date FROM repetitions AS r WHERE r.flashcard_uuid = f.uuid ORDER BY r.created_at LIMIT 1)::timestamp -
            DATE_TRUNC('day', created_at)
        );

UPDATE repetitions
  SET successful = FALSE
  WHERE successful IS NULL;

UPDATE repetitions
  SET actual_date = NULL
  WHERE run = FALSE;

ALTER TABLE repetitions
  DROP COLUMN id,
  DROP COLUMN flashcard_id,
  DROP COLUMN planned_date,
  DROP COLUMN run;

COMMIT;
