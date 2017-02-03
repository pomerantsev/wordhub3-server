BEGIN;

ALTER TABLE flashcards
  DROP COLUMN user_id;

DROP INDEX users_email_index;

DROP TABLE users;

COMMIT;
