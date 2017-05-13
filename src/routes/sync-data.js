import * as data from '../data/data';
import * as helpers from '../data/helpers';

export default async function SyncDataRoute (req, res) {
  try {
    const timestamp = parseFloat(req.query.timestamp) || 0;

    const {flashcards: reqFlashcards, repetitions: reqRepetitions} = req.body;
    const uniqueFlashcardUuids = helpers.getUniqueFlashcardUuids(reqFlashcards, reqRepetitions);
    const userIdsFromRequest = await data.getAllUserIdsFromFlashcardUuids(uniqueFlashcardUuids);
    if (userIdsFromRequest.length > 1 ||
        (userIdsFromRequest.length === 1 && userIdsFromRequest[0] !== req.user.id)) {
      res.status(403).json({error: 'Forbidden to perform changes on requested resources'});
      return;
    }

    // Insert flashcards and repetitions that we received from client.
    await data.syncData(req.user.id, req.body);

    // Get all flashcards and repetitions created after the server timestamp
    // client submitted with the request.
    const flashcardsAndRepetitions = await data.getAllFlashcardsAndRepetitions(req.user.id, timestamp);

    // Filter out flashcards and repetitions that were created during current request.
    const flashcardsAndRepetitionsWithoutCurrentlyReceived = Object.assign({}, flashcardsAndRepetitions, {
      flashcards: flashcardsAndRepetitions.flashcards.filter(flashcard =>
        !reqFlashcards.find(reqFlashcard => reqFlashcard.uuid === flashcard.uuid)),
      repetitions: flashcardsAndRepetitions.repetitions.filter(repetition =>
        !reqRepetitions.find(reqRepetition => reqRepetition.uuid === repetition.uuid))
    });

    res.send(flashcardsAndRepetitionsWithoutCurrentlyReceived);
  } catch (e) {
    res.status(400).json({errorCode: 0, message: e.message});
  }
}
