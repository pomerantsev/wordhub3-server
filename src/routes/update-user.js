import * as data from '../data/data';
import * as helpers from '../data/helpers';

export default async function UpdateUserRoute (req, res) {
  try {
    const name = req.body.name;
    const dailyLimit = req.body.dailyLimit;
    if (!helpers.nameIsValid(name) ||
        !helpers.dailyLimitIsValid(dailyLimit)) {
      res.status(403).json({error: 'Invalid data'});
      return;
    }
    await data.updateUser(req.user.id, {
      name,
      dailyLimit
    });
    res.sendStatus(204);
  } catch (e) {
    res.status(400).json({error: e.message});
  }
}
