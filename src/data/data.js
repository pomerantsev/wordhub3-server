import pg from 'pg';
import moment from 'moment';
import assert from 'assert';

const DATE_FORMAT = 'YYYY-MM-DD';

// This is a random date before the first repetition is created.
const SEED_DATE = '2016-12-25';


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
  return '\'' + escape(str) + '\'';
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

const config = {
  user: process.env.PGUSER,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  max: 10,
  idleTimeoutMillis: 30000
};

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

async function getAllFlashcards (timestamp) {
  const rawData = (await query(
    `
      SELECT uuid, front_text, (extract(epoch FROM created_at) * 1000) AS created_at, (extract(epoch FROM updated_at) * 1000) AS updated_at
      FROM flashcards
    ` + (timestamp ? `WHERE floor(extract(epoch FROM updated_at) * 1000) > floor(${float(timestamp)})\n` : '') +
    `ORDER BY created_at`
  )).rows;

  return rawData;
}

async function getAllRepetitions (timestamp) {
  const rawData = (await query(
    `
      SELECT uuid, flashcard_uuid, seq, planned_day, actual_date, (extract(epoch FROM created_at) * 1000) AS created_at, (extract(epoch FROM updated_at) * 1000) AS updated_at
      FROM repetitions
    ` +
    (timestamp ? `WHERE floor(extract(epoch FROM updated_at) * 1000) > floor(${float(timestamp)})\n` : '') +
    `ORDER BY created_at`
  )).rows;

  return rawData;
}

export async function getAllFlashcardsAndRepetitions (timestamp) {
  // TODO: Make it fully consistent (single call to db).
  const flashcards = await getAllFlashcards(timestamp);
  const repetitions = await getAllRepetitions(timestamp);
  const maxFlashcardTimestamp = flashcards.reduce((prev, cur) => Math.max(prev, cur.updatedAt), 0);
  const maxRepetitionTimestamp = repetitions.reduce((prev, cur) => Math.max(prev, cur.updatedAt), 0);
  return {
    flashcards: flashcards.map(flashcard => ({
      uuid: flashcard.uuid,
      frontText: flashcard.frontText,
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
export async function syncData (requestBody) {
  const {flashcards, repetitions} = requestBody;
  const queryText = `
    BEGIN;

    ${flashcards.length ?
      `
        INSERT INTO flashcards
          (uuid, front_text, created_at, updated_at)
          VALUES
          ${flashcards.map(flashcard =>
            `(
              ${string(flashcard.uuid)},
              ${string(flashcard.frontText)},
              LOCALTIMESTAMP,
              LOCALTIMESTAMP
            )`
          ).join(',\n')}
        ON CONFLICT (uuid) DO UPDATE
          SET
            front_text = EXCLUDED.front_text,
            updated_at = LOCALTIMESTAMP;
      ` : ''
    }

    ${repetitions.length ?
      `
        INSERT INTO repetitions
          (uuid, flashcard_uuid, seq, planned_day, actual_date, created_at, updated_at)
          VALUES
          ${repetitions.map(repetition =>
            `(
              ${string(repetition.uuid)},
              ${string(repetition.flashcardUuid)},
              ${integer(repetition.seq)},
              ${integer(repetition.plannedDay)},
              ${stringOrNull(repetition.actualDate)},
              LOCALTIMESTAMP,
              LOCALTIMESTAMP
            )`
          ).join(',\n')}
        ON CONFLICT (flashcard_uuid, seq) DO UPDATE
          SET
            uuid = EXCLUDED.uuid,
            planned_day = EXCLUDED.planned_day,
            actual_date = EXCLUDED.actual_date,
            updated_at = LOCALTIMESTAMP;
      ` : ''
    }

    COMMIT;
  `;

  await query(queryText);
}
