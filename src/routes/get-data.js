import * as data from '../data/data';

export default async function GetDataRoute (req, res) {
  try {
    const timestamp = parseFloat(req.query.timestamp) || 0;
    const allData = await data.getAllData(req.user.id, timestamp);
    res.send(allData);
  } catch (e) {
    res.status(400).json({error: e.message});
  }
}
