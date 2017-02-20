BEGIN;

DROP INDEX repetitions_updated_at_index;

DROP INDEX repetitions_created_at_index;

DROP INDEX repetitions_flashcard_uuid_index;

DROP INDEX flashcards_updated_at_index;

DROP INDEX flashcards_created_at_index;

DROP INDEX flashcards_user_id_index;

ALTER TABLE repetitions
  DROP COLUMN successful;

ALTER TABLE flashcards
  DROP COLUMN deleted,
  DROP COLUMN back_text;

COMMIT;
