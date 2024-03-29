CREATE TABLE users (
  id serial PRIMARY KEY,
  name varchar(25),
  email varchar(100) UNIQUE NOT NULL,
  hashed_password varchar(40) NOT NULL,
  salt varchar(40) NOT NULL,
  daily_limit integer NOT NULL DEFAULT 10,
  interface_language_cd integer NOT NULL DEFAULT 0,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE INDEX users_email_index ON users(email);

ALTER TABLE flashcards
  ADD COLUMN user_id integer;

ALTER TABLE flashcards
  ADD FOREIGN KEY (user_id) REFERENCES users(id);
