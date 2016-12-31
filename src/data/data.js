import pg from 'pg';
import moment from 'moment';

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

async function getCurrentDayNumber () {

}

export async function getAllFlashcards () {
  const rawData = (await query(`
    SELECT id
    FROM flashcards
    ORDER BY id
  `)).rows;

  return rawData;
}

export async function createFlashcard (currentDate) {
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
        RETURN (SELECT DATE_PART('day', '${currentDate}'::timestamp - '${SEED_DATE}'::timestamp));
      ELSE
        RETURN rec.planned_day + (SELECT DATE_PART('day', '${currentDate}'::timestamp - rec.actual_date::timestamp));
      END IF;
      END;
      $$
      LANGUAGE plpgsql;

    WITH inserted_flashcard AS (
      INSERT INTO flashcards
      DEFAULT VALUES
      RETURNING id
    )
    INSERT INTO repetitions
    (flashcard_id, seq, planned_day)
    SELECT id, 1, get_flashcard_creation_day() + ${MIN_DATE_DIFF} + floor(random() * ${MAX_DATE_DIFF - MIN_DATE_DIFF + 1})
    FROM inserted_flashcard;

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
      WHERE planned_day BETWEEN (SELECT planned_day FROM last_completed_day) + 1 AND (SELECT planned_day FROM last_completed_day) + (SELECT DATE_PART('day', '${currentDate}'::timestamp - (SELECT max_actual_date FROM last_completed_day)::timestamp))
      ORDER BY planned_day ASC
      LIMIT 1
    )
    SELECT r.id, r.flashcard_id, r.seq, r.planned_day, r.actual_date,
      (
        CASE
        WHEN (SELECT planned_day FROM last_completed_day) IS NULL
          AND (SELECT DATE_PART('day', '${currentDate}'::timestamp - '${SEED_DATE}'::timestamp)) >= (SELECT planned_day FROM first_day)
          AND r.planned_day = (SELECT planned_day FROM first_day)
          AND (r.actual_date IS NULL OR r.actual_date >= '${currentDate}')
          THEN true
        WHEN r.planned_day = (SELECT planned_day FROM last_completed_day)
          AND (SELECT max_actual_date FROM last_completed_day) >= '${currentDate}'
          AND r.actual_date = (SELECT max_actual_date FROM last_completed_day)
          THEN true
        WHEN r.planned_day = (SELECT planned_day FROM first_available_day_after_last_completed_day)
          AND (r.actual_date IS NULL OR r.actual_date >= '${currentDate}')
          AND (SELECT max_actual_date FROM last_completed_day) < '${currentDate}'
          THEN true
        ELSE false
        END
      ) AS today
    FROM repetitions AS r
    ORDER BY id
  `)).rows;

  return rawData
    .map(row => Object.assign({}, row, {actualDate: row.actualDate ? moment(row.actualDate).format('D MMM YYYY') : ''}));
}

export async function memorizeRepetition (id, date) {
  await query(`
    BEGIN;

    UPDATE repetitions
    SET actual_date = '${date}'
    WHERE id = ${id};

    DROP FUNCTION IF EXISTS add_repetition_if_necessary();

    CREATE OR REPLACE FUNCTION add_repetition_if_necessary()
      RETURNS void
      AS $$
      DECLARE rec record;
      BEGIN
      SELECT * INTO rec
      FROM repetitions AS r
      WHERE r.id = ${id};
      IF rec.seq = 1 THEN
        INSERT INTO repetitions
        (flashcard_id, seq, planned_day)
        VALUES (rec.flashcard_id, 2, rec.planned_day + 5 + floor(random() * 6));
      ELSIF rec.seq = 2 THEN
        INSERT INTO repetitions
        (flashcard_id, seq, planned_day)
        VALUES (rec.flashcard_id, 3, rec.planned_day + 20 + floor(random() * 11));
      END IF;
      END;
      $$
      LANGUAGE plpgsql;

    SELECT add_repetition_if_necessary();

    COMMIT;
  `);
}
