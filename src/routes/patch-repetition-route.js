import * as data from '../data/data';

export default async function PatchRepetitionRoute (req, res) {
  await data.memorizeRepetition(req.params.uuid, req.body.actualDate);
  res.redirect(`/?date=${req.body.actualDate}`);
}
