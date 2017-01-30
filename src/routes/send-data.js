import * as data from '../data/data';

export default async function SendDataRoute (req, res) {
  try {
    await data.syncData(req.body);
    res.sendStatus(201);
  } catch (e) {
    res.status(400).json({error: e.message});
  }
}
