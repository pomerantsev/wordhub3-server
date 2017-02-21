ALTER TABLE repetitions
  DROP CONSTRAINT IF EXISTS repetitions_flashcard_uuid_fkey;

ALTER TABLE repetitions
  ADD CONSTRAINT repetitions_flashcard_uuid_fkey
  FOREIGN KEY (flashcard_uuid)
  REFERENCES flashcards(uuid)
  ON DELETE RESTRICT;

ALTER TABLE flashcards
  DROP CONSTRAINT IF EXISTS flashcards_user_id_fkey;

ALTER TABLE flashcards
  ADD CONSTRAINT flashcards_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE RESTRICT;
