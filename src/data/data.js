import pg from 'pg';
import moment from 'moment';
import assert from 'assert';

import configs from '../../db-config';

// http://stackoverflow.com/a/7760578
function escape (str) {
  return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, char => {
    switch (char) {
    case '\0':
      return '\\0';
    case '\x08':
      return '\\b';
    case '\x09':
      return '\\t';
    case '\x1a':
      return '\\z';
    case '\n':
      return '\\n';
    case '\r':
      return '\\r';
    case '"':
    case '\'':
    case '\\':
    case '%':
      return '\\' + char; // prepends a backslash to backslash, percent,
                          // and double/single quotes
    }
  });
}

function integer (num) {
  assert.equal(typeof num, 'number');
  assert.equal(Math.floor(num), num);
  return String(num);
}

function float (num) {
  assert.equal(typeof num, 'number');
  return String(num);
}

function string (str) {
  assert.equal(typeof str, 'string');
  // We need the E before the string because only then
  // are escaped characters treated as we expect them to.
  // https://www.postgresql.org/docs/9.6/static/sql-syntax-lexical.html
  return 'E\'' + escape(str) + '\'';
}

function boolean (bool) {
  return bool ? 'TRUE' : 'FALSE';
}

function stringOrNull (str) {
  assert.ok(
    typeof str === 'string' ||
      (typeof str === 'object' && !str) ||
      typeof str === 'undefined'
  );
  if (typeof str === 'string') {
    return '\'' + escape(str) + '\'';
  } else {
    return 'NULL';
  }
}

function camelizeKeys (rows) {
  return rows.map(row => {
    const result = {};
    for (const key of Object.keys(row)) {
      const camelizedKey = key.replace(/_(\w)/g, (unused, c) => c.toUpperCase());
      result[camelizedKey] = row[key];
    }
    return result;
  });
}

const config = configs[process.env.NODE_ENV];

const pool = new pg.Pool(config);

async function query (input) {
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
              rows: camelizeKeys(data.rows),
              rowCount: data.rowCount
            });
          }
        });
      }
    });
  });
}

export async function getUserByEmail (email) {
  const user = (await query(`
    SELECT *
    FROM users
    WHERE email = ${string(email)}
  `)).rows[0];

  return user;
}

export async function getUserById (id) {
  const user = (await query(`
    SELECT *
    FROM users
    WHERE id = ${integer(id)}
  `)).rows[0];

  return user;
}

export async function createUser (user) {
  await query(`
    INSERT
    INTO users
    (email, name, hashed_password, salt, created_at, updated_at)
    VALUES
    (
      ${string(user.email)},
      ${stringOrNull(user.name)},
      ${string(user.hashedPassword)},
      ${string(user.salt)},
      LOCALTIMESTAMP,
      LOCALTIMESTAMP
    )
  `);
}

export async function updateUser (id, user) {
  await query(`
    UPDATE users
    SET
      name = ${stringOrNull(user.name)},
      daily_limit = ${integer(user.dailyLimit)},
      updated_at = LOCALTIMESTAMP
    WHERE id = ${integer(id)}
  `);
}

export async function getAllUserIdsFromFlashcardUuids (flashcardUuids) {
  const userIds = flashcardUuids.length > 0 ?
    (await query(`
      SELECT DISTINCT user_id
      FROM flashcards
      WHERE uuid IN (${flashcardUuids.map(uuid => string(uuid)).join(', ')})
    `)).rows
      .map(flashcard => flashcard.userId) :
    [];

  return userIds;
}

async function getAllFlashcards (userId, timestamp) {
  const rawData = (await query(
    `
      SELECT uuid, front_text, back_text, deleted, (extract(epoch FROM created_at) * 1000) AS created_at, (extract(epoch FROM updated_at) * 1000) AS updated_at
      FROM flashcards
      WHERE user_id = ${integer(userId)}
    ` + (timestamp ? `AND floor(extract(epoch FROM updated_at) * 1000) > floor(${float(timestamp)})\n` : '') +
    'ORDER BY created_at'
  )).rows;

  return rawData;
}

async function getAllRepetitions (userId, timestamp) {
  const rawData = (await query(
    `
      SELECT uuid, flashcard_uuid, seq, planned_day, actual_date, successful, (extract(epoch FROM created_at) * 1000) AS created_at, (extract(epoch FROM updated_at) * 1000) AS updated_at
      FROM repetitions
      WHERE flashcard_uuid IN (SELECT uuid FROM flashcards WHERE user_id = ${integer(userId)})
    ` +
    (timestamp ? `AND floor(extract(epoch FROM updated_at) * 1000) > floor(${float(timestamp)})\n` : '') +
    'ORDER BY created_at'
  )).rows;

  return rawData;
}

export async function getAllFlashcardsAndRepetitions (userId, timestamp) {
  // TODO: Make it fully consistent (single call to db).
  const flashcards = await getAllFlashcards(userId, timestamp);
  const repetitions = await getAllRepetitions(userId, timestamp);
  const maxFlashcardTimestamp = flashcards.reduce((prev, cur) => Math.max(prev, cur.updatedAt), 0);
  const maxRepetitionTimestamp = repetitions.reduce((prev, cur) => Math.max(prev, cur.updatedAt), 0);
  return {
    flashcards: flashcards.map(flashcard => ({
      uuid: flashcard.uuid,
      frontText: flashcard.frontText,
      backText: flashcard.backText,
      deleted: flashcard.deleted,
      createdAt: flashcard.createdAt,
      updatedAt: flashcard.updatedAt
    })),
    repetitions: repetitions.map(repetition => ({
      uuid: repetition.uuid,
      flashcardUuid: repetition.flashcardUuid,
      seq: repetition.seq,
      plannedDay: repetition.plannedDay,
      actualDate: repetition.actualDate ?
        moment(repetition.actualDate).format('YYYY-MM-DD') :
        null,
      successful: repetition.successful,
      createdAt: repetition.createdAt,
      updatedAt: repetition.updatedAt
    })),
    updatedAt: Math.max(maxFlashcardTimestamp, maxRepetitionTimestamp, (timestamp || 0))
  };
}

/**
 * This function accepts two arrays (with flashcards and repetitions).
 * It doesn't throw only if input is valid:
 * - flashcards and repetitions are arrays
 * - each element of each array is an object
 * - each flashcard consists of uuid and frontText (both text) (to be expanded)
 * - each repetition consists of uuid (text), flashcardUuid (text),
 *   seq (int), plannedDay (int), actualDate (text or null) (to be expanded)
 * - no two repetitions can have the same uuid, or the same flashcardUuid and seq
 * - no repetition should have a flashcardUuid that doesn't exist in the db
 */
export async function syncData (userId, requestBody) {
  const {flashcards, repetitions} = requestBody;

  // There can be two legitimate types of conflicts for repetitions:
  // - updating an existing repetition (the most basic conflict,
  // happening every time a repetition is run)
  // - creating a repetition for the same flashcard
  // on a different client (a much less frequent case)
  // In both cases flashcard_uuid and seq should be the same,
  // so we can just update the repetition anyway and worry little
  // about the second case (the two versions of the repetition
  // have the same weight, so it's okay to overwrite the previous version).
  // The client should take care of this situation (a repetition with
  // the original uuid being removed).
  const queryText = `
    BEGIN;

    ${flashcards.length ?
      `
        INSERT INTO flashcards
          (user_id, uuid, front_text, back_text, deleted, created_at, updated_at)
          VALUES
          ${flashcards.map(flashcard =>
            `(
              ${integer(userId)},
              ${string(flashcard.uuid)},
              ${string(flashcard.frontText)},
              ${string(flashcard.backText)},
              ${boolean(flashcard.deleted)},
              LOCALTIMESTAMP,
              LOCALTIMESTAMP
            )`
          ).join(',\n')}
        ON CONFLICT (uuid) DO UPDATE
          SET
            front_text = EXCLUDED.front_text,
            back_text = EXCLUDED.back_text,
            deleted = EXCLUDED.deleted,
            updated_at = LOCALTIMESTAMP;
      ` : ''
    }

    ${repetitions.length ?
      `
        INSERT INTO repetitions
          (uuid, flashcard_uuid, seq, planned_day, actual_date, successful, created_at, updated_at)
          VALUES
          ${repetitions.map(repetition =>
            `(
              ${string(repetition.uuid)},
              ${string(repetition.flashcardUuid)},
              ${integer(repetition.seq)},
              ${integer(repetition.plannedDay)},
              ${stringOrNull(repetition.actualDate)},
              ${boolean(repetition.successful)},
              LOCALTIMESTAMP,
              LOCALTIMESTAMP
            )`
          ).join(',\n')}
        ON CONFLICT (flashcard_uuid, seq) DO UPDATE
          SET
            uuid = EXCLUDED.uuid,
            planned_day = EXCLUDED.planned_day,
            actual_date = EXCLUDED.actual_date,
            successful = EXCLUDED.successful,
            updated_at = LOCALTIMESTAMP;
      ` : ''
    }

    COMMIT;
  `;

  await query(queryText);
}
