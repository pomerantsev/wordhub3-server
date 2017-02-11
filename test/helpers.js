import pg from 'pg';
import DBMigrate from 'db-migrate';
const dbMigrate = DBMigrate.getInstance(true, {env: 'test'});
dbMigrate.silence(true);

import configs from '../db-config';
import * as auth from '../src/data/auth';

const config = configs[process.env.NODE_ENV];

const pool = new pg.Pool(config);

export async function query (input) {
  return await new Promise((resolve, reject) => {
    pool.connect((err, client, done) => {
      if (err) {
        reject(err);
      } else {
        client.query(input, (queryErr, data) => {
          done();
          if (queryErr) {
            console.error(queryErr);
            reject(queryErr);
          } else {
            resolve({
              rows: data.rows,
              rowCount: data.rowCount
            });
          }
        });
      }
    });
  });
}

async function clearDb () {
  await query(`
    DROP TABLE IF EXISTS repetitions;
    DROP TABLE IF EXISTS flashcards;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS migrations;
  `);
}

export async function truncateTables () {
  await query(`
    TRUNCATE TABLE users CASCADE;
  `);
}

export async function setupDb () {
  await clearDb();
  await dbMigrate.up();
}

export async function teardownDb () {
  await dbMigrate.reset();
}

export async function seed () {
  const email1 = 'email1@example.com';
  const password1 = 'pass1';
  const salt1 = 'salt1';
  const hashedPassword1 = auth.hashPassword(password1, salt1);

  const email2 = 'email2@example.com';
  const password2 = 'pass2';
  const salt2 = 'salt2';
  const hashedPassword2 = auth.hashPassword(password2, salt2);
  await query(`
    INSERT INTO users
      (id, email, hashed_password, salt)
      VALUES
      (1, '${email1}', '${hashedPassword1}', '${salt1}'),
      (2, '${email2}', '${hashedPassword2}', '${salt2}');
    INSERT INTO flashcards
      (user_id, uuid, updated_at)
      VALUES
      (1, 'fl11', to_timestamp(1)),
      (1, 'fl12', to_timestamp(5)),
      (2, 'fl21', to_timestamp(2)),
      (2, 'fl22', to_timestamp(6));
    INSERT INTO repetitions
      (flashcard_uuid, uuid, seq, planned_day, updated_at)
      VALUES
      ('fl11', 'rep111', 1, 2, to_timestamp(1)),
      ('fl12', 'rep121', 1, 7, to_timestamp(6)),
      ('fl21', 'rep211', 1, 3, to_timestamp(2)),
      ('fl22', 'rep221', 1, 7, to_timestamp(6));
  `);
}
