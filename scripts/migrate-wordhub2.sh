#!/bin/bash
#
# $1 - intermediate database
# $2 - target database
# $3 - dump file
# $4 - db-migrate env
# $5 - db host
# $6 - db port
# $7 - db username

OUT_DUMP=./out-dump

psql -f ./scripts/migrate-wordhub2-initiate.sql
pg_restore --exit-on-error \
           --dbname $1 \
           $3

psql -d $1 -f ./scripts/migrate-wordhub2.sql

rm -rf $OUT_DUMP

pg_dump --data-only \
        --file=$OUT_DUMP \
        --no-owner \
        --table=users \
        --table=flashcards \
        --table=repetitions \
        --format=directory \
        $1

db-migrate reset -e $4
db-migrate up -e $4

psql -d $2 \
     --host=$5 \
     --port=$6 \
     --username=$7 \
     -c "ALTER TABLE flashcards DROP CONSTRAINT IF EXISTS flashcards_user_id_fkey; ALTER TABLE repetitions DROP CONSTRAINT IF EXISTS repetitions_flashcard_uuid_fkey;"

pg_restore --exit-on-error \
           --dbname $2 \
           --host=$5 \
           --port=$6 \
           --username=$7 \
           --table users \
           --table flashcards \
           --table repetitions \
           $OUT_DUMP

psql -d $2 \
     --host=$5 \
     --port=$6 \
     --username=$7 \
     -c "ALTER TABLE flashcards ADD CONSTRAINT flashcards_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE; ALTER TABLE repetitions ADD CONSTRAINT repetitions_flashcard_uuid_fkey FOREIGN KEY (flashcard_uuid) REFERENCES flashcards(uuid) ON DELETE CASCADE;"
