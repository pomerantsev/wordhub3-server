BEGIN;

CREATE TABLE flashcards (
  id serial PRIMARY KEY
);

CREATE TABLE repetitions (
  id serial PRIMARY KEY,
  flashcard_id integer REFERENCES flashcards(id),
  seq integer NOT NULL,
  planned_day integer NOT NULL,
  actual_date date,
  UNIQUE (flashcard_id, seq)
);

COMMIT;
