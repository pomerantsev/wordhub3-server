import pg from 'pg';
import moment from 'moment';
import assert from 'assert';

import * as helpers from './helpers';

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



/*
 * The following assertions are used for inserting different types
 * of data into SQL queries. We first ensure the value is of the necessary type
 * (to prevent any injections), and then return a string that can be safely
 * inserted into the query.
 * It is up to the calling to code how to handle exceptions thrown by `assert`.
 */
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
  // escaped characters are treated as we expect them to be.
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
    (email, name, hashed_password, salt, interface_language_id, created_at, updated_at)
    VALUES
    (
      ${string(user.email)},
      ${stringOrNull(user.name)},
      ${string(user.hashedPassword)},
      ${string(user.salt)},
      ${integer(user.interfaceLanguageId)},
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
      interface_language_id = ${integer(user.interfaceLanguageId)},
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

// We only use union here instead of two separate queries to flashcards and repetitions
// to ensure that no flashcard or repetition is lost.
// Which could have happened when two separate queries were made. For example:
// - flashcards query returns at timestamp 10;
// - a new flashcard is created at timestamp 15;
// - repetitions query returns at timestamp 20;
// - 20 is sent to client as updatedAt
// - client uses 20 as timestamp next time
// - the flashcard created at 15 never gets to the client.
export async function getAllFlashcardsAndRepetitions (userId, timestamp) {
  const rows = (await query(
    `
      SELECT
        uuid,
        front_text AS f_front_text,
        back_text AS f_back_text,
        creation_date AS f_creation_date,
        creation_day AS f_creation_day,
        deleted AS f_deleted,
        '' AS r_flashcard_uuid,
        -1 AS r_seq,
        -1 AS r_planned_day,
        to_date('01-01-0001', 'DD-MM-YYYY') AS r_actual_date,
        NULL AS r_successful,
        (extract(epoch FROM created_at) * 1000) AS created_at,
        (extract(epoch FROM updated_at) * 1000) AS updated_at
      FROM flashcards
      WHERE user_id = ${integer(userId)}
    ` + (timestamp ? `AND floor(extract(epoch FROM updated_at) * 1000) > floor(${float(timestamp)})\n` : '') +
    'UNION' +
    `
      SELECT
        uuid,
        '' AS f_front_text,
        '' AS f_back_text,
        '' AS f_creation_date,
        -1 AS f_creation_day,
        NULL AS f_deleted,
        flashcard_uuid AS r_flashcard_uuid,
        seq AS r_seq,
        planned_day AS r_planned_day,
        actual_date AS r_actual_date,
        successful AS r_successful,
        (extract(epoch FROM created_at) * 1000) AS created_at,
        (extract(epoch FROM updated_at) * 1000) AS updated_at
      FROM repetitions
      WHERE flashcard_uuid IN (SELECT uuid FROM flashcards WHERE user_id = ${integer(userId)})
    ` +
    (timestamp ? `AND floor(extract(epoch FROM updated_at) * 1000) > floor(${float(timestamp)})\n` : '') +
    'ORDER BY created_at'
  )).rows;

  const flashcards = rows.filter(row => row.rSeq === -1);
  const repetitions = rows.filter(row => row.fCreationDay === -1);
  const maxTimestamp = rows.reduce((prev, cur) => Math.max(prev, cur.updatedAt), 0);
  return {
    flashcards: flashcards.map(flashcard => ({
      uuid: flashcard.uuid,
      frontText: flashcard.fFrontText,
      backText: flashcard.fBackText,
      creationDate: flashcard.fCreationDate,
      creationDay: flashcard.fCreationDay,
      deleted: flashcard.fDeleted,
      createdAt: flashcard.createdAt,
      updatedAt: flashcard.updatedAt
    })),
    repetitions: repetitions.map(repetition => ({
      uuid: repetition.uuid,
      flashcardUuid: repetition.rFlashcardUuid,
      seq: repetition.rSeq,
      plannedDay: repetition.rPlannedDay,
      actualDate: repetition.rActualDate ?
        moment(repetition.rActualDate).format('YYYY-MM-DD') :
        null,
      successful: repetition.rSuccessful,
      createdAt: repetition.createdAt,
      updatedAt: repetition.updatedAt
    })),
    updatedAt: Math.max(maxTimestamp, (timestamp || 0))
  };
}

export async function getAllData (userId, timestamp) {
  return Promise.all([
    getAllFlashcardsAndRepetitions(userId, timestamp),
    getUserById(userId)
  ]).then(([flashcardsAndRepetitions, userData]) => Object.assign({}, flashcardsAndRepetitions, {
    userSettings: helpers.getUserSettings(userData)
  }));
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
          (user_id, uuid, front_text, back_text, creation_date, creation_day, deleted, created_at, updated_at)
          VALUES
          ${flashcards.map(flashcard =>
            `(
              ${integer(userId)},
              ${string(flashcard.uuid)},
              ${string(flashcard.frontText)},
              ${string(flashcard.backText)},
              ${string(flashcard.creationDate)},
              ${integer(flashcard.creationDay)},
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
