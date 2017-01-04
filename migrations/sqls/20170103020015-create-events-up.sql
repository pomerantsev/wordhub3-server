CREATE TABLE events (
  id serial PRIMARY KEY,
  type text NOT NULL,
  action text NOT NULL,
  updates jsonb
);
