import * as data from '../data/data';

export default async function UpdateFlashcardRoute (req, res) {
  const date = req.body.actualDate || moment().format(DATE_FORMAT);
  const id = req.body.id;
  const frontText = req.body.frontText;
  try {
    await data.updateFlashcard(id, frontText);
    res.redirect(`/?date=${date}`);
  } catch (e) {
    res.sendStatus(400);
  }
}
