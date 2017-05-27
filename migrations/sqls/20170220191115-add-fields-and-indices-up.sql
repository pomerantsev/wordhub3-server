ALTER TABLE flashcards
  ADD COLUMN back_text text,
  ADD COLUMN deleted boolean NOT NULL DEFAULT FALSE;

ALTER TABLE repetitions
  ADD COLUMN successful boolean NOT NULL DEFAULT FALSE;

CREATE INDEX flashcards_user_id_index ON flashcards(user_id);

CREATE INDEX flashcards_created_at_index ON flashcards(created_at);

CREATE INDEX flashcards_updated_at_index ON flashcards(updated_at);

CREATE INDEX repetitions_flashcard_uuid_index ON repetitions(flashcard_uuid);

CREATE INDEX repetitions_created_at_index ON repetitions(created_at);

CREATE INDEX repetitions_updated_at_index ON repetitions(updated_at);
