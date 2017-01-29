import moment from 'moment';
import * as data from '../data/data';

export default async function GetDataRoute (req, res) {
  const timestamp = req.query.timestamp || 0;

  // Maybe we should make it fully consistent?
  // This works for now though.
  const flashcards = await data.getAllFlashcardsSimple(timestamp);
  const repetitions = await data.getAllRepetitionsSimple(timestamp);
  const maxFlashcardTimestamp = flashcards.reduce((prev, cur) => Math.max(prev, cur.updatedAt), 0);
  const maxRepetitionTimestamp = repetitions.reduce((prev, cur) => Math.max(prev, cur.updatedAt), 0);
  res.send({
    flashcards: flashcards.map(flashcard => ({
      uuid: flashcard.uuid,
      frontText: flashcard.frontText,
      createdAt: flashcard.createdAt,
      updatedAt: flashcard.updatedAt
    })),
    repetitions: repetitions.map(repetition => ({
      uuid: repetition.uuid,
      flashcardUuid: repetition.flashcardUuid,
      seq: repetition.seq,
      plannedDay: repetition.plannedDay,
      actualDate: repetition.actualDate ?
        moment(repetition.actualDate).format('YYYY-MM-DD') :
        null,
      createdAt: repetition.createdAt,
      updatedAt: repetition.updatedAt
    })),
    updatedAt: Math.max(maxFlashcardTimestamp, maxRepetitionTimestamp, (timestamp || 0))
  });
}
