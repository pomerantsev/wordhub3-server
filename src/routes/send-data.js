import * as data from '../data/data';

export default async function SendDataRoute (req, res) {
  const {flashcards, repetitions} = req.body;
  await data.syncData(flashcards, repetitions);
  res.sendStatus(201);
}
