import * as data from '../data/data';

export default async function CreateFlashcardRoute (req, res) {
  const date = req.body.actualDate || moment().format(DATE_FORMAT);
  await data.createFlashcard(date);
  res.redirect(`/?date=${date}`);
}
