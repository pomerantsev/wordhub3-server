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

export async function getAllFlashcards () {
  const rawData = (await query(`
    SELECT uuid, front_text, updated_at
    FROM flashcards
    ORDER BY created_at
  `)).rows;

  return rawData;
}

export async function getAllFlashcardsSimple (timestamp) {
  const rawData = (await query(
    `
      SELECT uuid, front_text, (extract(epoch FROM created_at) * 1000) AS created_at, (extract(epoch FROM updated_at) * 1000) AS updated_at
      FROM flashcards
    ` + (timestamp ? `WHERE (extract(epoch FROM updated_at) * 1000) > ${integer(timestamp)}\n` : '') +
    `ORDER BY created_at`
  )).rows;

  return rawData;
}

export async function createFlashcard (currentDate, frontText) {
  const MIN_DATE_DIFF = 1;
  const MAX_DATE_DIFF = 3;

  await query(`
    BEGIN;

    DROP FUNCTION IF EXISTS get_flashcard_creation_day();

    CREATE OR REPLACE FUNCTION get_flashcard_creation_day()
      RETURNS integer
      AS $$
      DECLARE rec record;
      BEGIN
      SELECT r.planned_day, r.actual_date INTO rec
      FROM repetitions AS r
      WHERE r.actual_date IS NOT NULL
      ORDER BY r.actual_date DESC
      LIMIT 1;
      IF rec IS NULL
      THEN
        RETURN (SELECT DATE_PART('day', ${string(currentDate)}::timestamp - '${SEED_DATE}'::timestamp));
      ELSE
        RETURN rec.planned_day + (SELECT DATE_PART('day', ${string(currentDate)}::timestamp - rec.actual_date::timestamp));
      END IF;
      END;
      $$
      LANGUAGE plpgsql;

    DROP FUNCTION IF EXISTS insert_flashcard();

    CREATE OR REPLACE FUNCTION insert_flashcard() RETURNS void AS $$
      DECLARE
        inserted_flashcard_uuid uuid;
        inserted_repetition_uuid uuid;
        seq integer := 1;
        planned_day integer := get_flashcard_creation_day() + ${MIN_DATE_DIFF} + floor(random() * ${MAX_DATE_DIFF - MIN_DATE_DIFF + 1});
      BEGIN
        INSERT INTO flashcards
        (uuid, front_text, created_at, updated_at)
        VALUES
        (gen_random_uuid(), ${string(frontText)}, LOCALTIMESTAMP, LOCALTIMESTAMP)
        RETURNING uuid
        INTO inserted_flashcard_uuid;

        INSERT INTO repetitions
        (uuid, flashcard_uuid, seq, planned_day, created_at, updated_at)
        VALUES (gen_random_uuid(), inserted_flashcard_uuid, seq, planned_day, LOCALTIMESTAMP, LOCALTIMESTAMP)
        RETURNING uuid
        INTO inserted_repetition_uuid;
      END;
    $$ LANGUAGE plpgsql;

    SELECT insert_flashcard();

    COMMIT;
  `);
}

export async function updateFlashcard (uuid, frontText) {
  await query(`
    BEGIN;

    UPDATE flashcards
      SET
      front_text = ${string(frontText)},
      updated_at = LOCALTIMESTAMP
    WHERE uuid = ${string(uuid)};

    COMMIT;
  `);
}

export async function getAllRepetitions (currentDate) {
  const rawData = (await query(`
    WITH last_completed_day AS (
      SELECT planned_day, max(actual_date) AS max_actual_date
      FROM repetitions
      GROUP BY planned_day
      HAVING every(actual_date IS NOT NULL)
      ORDER BY planned_day DESC
      LIMIT 1
    ),
    first_day AS (
      SELECT planned_day
      FROM repetitions
      GROUP BY planned_day
      ORDER BY planned_day ASC
      LIMIT 1
    ),
    first_available_day_after_last_completed_day AS (
      SELECT planned_day
      FROM repetitions
      WHERE planned_day BETWEEN (SELECT planned_day FROM last_completed_day) + 1 AND (SELECT planned_day FROM last_completed_day) + (SELECT DATE_PART('day', ${string(currentDate)}::timestamp - (SELECT max_actual_date FROM last_completed_day)::timestamp))
      ORDER BY planned_day ASC
      LIMIT 1
    )
    SELECT r.uuid, r.flashcard_uuid, r.seq, r.planned_day, r.actual_date, r.updated_at,
      (
        CASE
        WHEN (SELECT planned_day FROM last_completed_day) IS NULL
          AND (SELECT DATE_PART('day', ${string(currentDate)}::timestamp - '${SEED_DATE}'::timestamp)) >= (SELECT planned_day FROM first_day)
          AND r.planned_day = (SELECT planned_day FROM first_day)
          AND (r.actual_date IS NULL OR r.actual_date >= ${string(currentDate)})
          THEN true
        WHEN r.planned_day = (SELECT planned_day FROM last_completed_day)
          AND (SELECT max_actual_date FROM last_completed_day) >= ${string(currentDate)}
          AND r.actual_date = (SELECT max_actual_date FROM last_completed_day)
          THEN true
        WHEN r.planned_day = (SELECT planned_day FROM first_available_day_after_last_completed_day)
          AND (r.actual_date IS NULL OR r.actual_date >= ${string(currentDate)})
          AND (SELECT max_actual_date FROM last_completed_day) < ${string(currentDate)}
          THEN true
        ELSE false
        END
      ) AS today
    FROM repetitions AS r
    ORDER BY created_at
  `)).rows;

  return rawData
    .map(row => Object.assign({}, row, {actualDate: row.actualDate ? moment(row.actualDate).format('D MMM YYYY') : ''}));
}

export async function getAllRepetitionsSimple (timestamp) {
  const rawData = (await query(
    `
      SELECT uuid, flashcard_uuid, seq, planned_day, actual_date, (extract(epoch FROM created_at) * 1000) AS created_at, (extract(epoch FROM updated_at) * 1000) AS updated_at
      FROM repetitions
    ` +
    (timestamp ? `WHERE (extract(epoch FROM updated_at) * 1000) > ${integer(timestamp)}\n` : '') +
    `ORDER BY created_at`
  )).rows;

  return rawData;
}

export async function memorizeRepetition (uuid, date) {
  await query(`
    BEGIN;

    UPDATE repetitions
      SET
      actual_date = ${string(date)},
      updated_at = LOCALTIMESTAMP
    WHERE uuid = ${string(uuid)};

    DROP FUNCTION IF EXISTS add_repetition_if_necessary();

    CREATE OR REPLACE FUNCTION add_repetition_if_necessary()
      RETURNS void
      AS $$
      DECLARE
        rec record;
        inserted_repetition_uuid uuid;
        new_planned_day integer;
        new_seq integer;
      BEGIN
        SELECT * INTO rec
        FROM repetitions AS r
        WHERE r.uuid = ${string(uuid)};
        new_planned_day := CASE
          WHEN rec.seq = 1 THEN rec.planned_day + 5 + floor(random() * 6)
          WHEN rec.seq = 2 THEN rec.planned_day + 20 + floor(random() * 11)
          ELSE NULL
          END;
        new_seq := rec.seq + 1;
        IF new_planned_day IS NOT NULL THEN
          INSERT INTO repetitions
          (uuid, flashcard_uuid, seq, planned_day, created_at, updated_at)
          VALUES (gen_random_uuid(), rec.flashcard_uuid, new_seq, new_planned_day, LOCALTIMESTAMP, LOCALTIMESTAMP)
          RETURNING uuid
          INTO inserted_repetition_uuid;
        END IF;
      END;
      $$
      LANGUAGE plpgsql;

    SELECT add_repetition_if_necessary();

    COMMIT;
  `);
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
