import * as data from '../data/data';

export default async function GetDataRoute (req, res) {
  try {
    const timestamp = parseFloat(req.query.timestamp) || 0;
    const flashcardsAndRepetitions = await data.getAllFlashcardsAndRepetitions(timestamp);
    res.send(flashcardsAndRepetitions);
  } catch (e) {
    res.status(400).json({error: e.message});
  }
}
