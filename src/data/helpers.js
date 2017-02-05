export function getUniqueFlashcardUuids (flashcards, repetitions) {
  const flashcardUuids = flashcards.map(flashcard => flashcard.uuid);
  const repetitionFlashcardUuids = repetitions.map(rep => rep.flashcardUuid);
  return [...new Set([...flashcardUuids, ...repetitionFlashcardUuids]).values()];
}
