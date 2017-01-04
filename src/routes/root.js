import * as data from '../data/data';

import moment from 'moment';

const DATE_FORMAT = 'YYYY-MM-DD';

export default async function RootRoute (req, res) {
  const date = req.query.date || moment().format(DATE_FORMAT);
  res.render('index', {
    date,
    flashcards: await data.getAllFlashcards(),
    repetitions: await data.getAllRepetitions(date),
    events: await data.getAllEvents()
  });
};
