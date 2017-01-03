CREATE TABLE changes (
  id serial PRIMARY KEY,
  type text NOT NULL,
  action text NOT NULL,
  updates json
);
