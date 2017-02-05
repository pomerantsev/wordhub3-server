import * as data from '../data/data';
import * as helpers from '../data/helpers';

export default async function SendDataRoute (req, res) {
  try {
    const {flashcards, repetitions} = req.body;
    const uniqueFlashcardUuids = helpers.getUniqueFlashcardUuids(flashcards, repetitions);
    const userIdsFromRequest = await data.getAllUserIdsFromFlashcardUuids(uniqueFlashcardUuids);
    if (userIdsFromRequest.length > 1 ||
        (userIdsFromRequest.length === 1 && userIdsFromRequest[0] !== req.user.id)) {
      res.status(403).json({error: 'Forbidden to perform changes on requested resources'});
      return;
    }
    await data.syncData(req.user.id, req.body);
    res.sendStatus(200);
  } catch (e) {
    res.status(400).json({error: e.message});
  }
}
