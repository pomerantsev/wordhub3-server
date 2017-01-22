import * as data from '../data/data';

export default async function UpdateFlashcardRoute (req, res) {
  const date = req.body.actualDate || moment().format(DATE_FORMAT);
  const uuid = req.body.uuid;
  const frontText = req.body.frontText;
  try {
    await data.updateFlashcard(uuid, frontText);
    res.redirect(`/?date=${date}`);
  } catch (e) {
    res.sendStatus(400);
  }
}
