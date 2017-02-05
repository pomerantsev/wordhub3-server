import * as data from '../data/data';
import * as helpers from '../data/helpers';

export default async function SyncDataRoute (req, res) {
  try {
    const timestamp = parseFloat(req.query.timestamp) || 0;
    const flashcardsAndRepetitions = await data.getAllFlashcardsAndRepetitions(req.user.id, timestamp);

    const {flashcards: reqFlashcards, repetitions: reqRepetitions} = req.body;
    const uniqueFlashcardUuids = helpers.getUniqueFlashcardUuids(reqFlashcards, reqRepetitions);
    const userIdsFromRequest = await data.getAllUserIdsFromFlashcardUuids(uniqueFlashcardUuids);
    if (userIdsFromRequest.length > 1 ||
        (userIdsFromRequest.length === 1 && userIdsFromRequest[0] !== req.user.id)) {
      res.status(403).json({error: 'Forbidden to perform changes on requested resources'});
      return;
    }

    await data.syncData(req.user.id, req.body);
    res.send(flashcardsAndRepetitions);
  } catch (e) {
    res.status(400).json({error: e.message});
  }
}
