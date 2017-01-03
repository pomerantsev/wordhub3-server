import * as data from '../data/data';

export default async function CreateFlashcardRoute (req, res) {
  const date = req.body.actualDate || moment().format(DATE_FORMAT);
  const frontText = req.body.frontText;
  try {
    await data.createFlashcard(date, frontText);
    res.redirect(`/?date=${date}`);
  } catch (e) {
    res.sendStatus(400);
  }
}
