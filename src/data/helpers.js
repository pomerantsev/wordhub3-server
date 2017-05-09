export function getUniqueFlashcardUuids (flashcards, repetitions) {
  const flashcardUuids = flashcards.map(flashcard => flashcard.uuid);
  const repetitionFlashcardUuids = repetitions.map(rep => rep.flashcardUuid);
  return [...new Set([...flashcardUuids, ...repetitionFlashcardUuids]).values()];
}

export function emailIsValid (email) {
  return email.length > 0 &&
    email.length <= 100 &&
    email.indexOf('@') > -1;
}

export function passwordIsValid (password) {
  return password.length >= 6 && password.length <= 25;
}

export function nameIsValid (name) {
  return !name || name.length <= 25;
}

export function dailyLimitIsValid (dailyLimit) {
  return Number(dailyLimit) > 0 && Math.floor(dailyLimit) === dailyLimit;
}

export function getLanguageEnum (language) {
  switch (language) {
  case 'ru':
    return 0;
  case 'en':
    return 1;
  default:
    return 1;
  }
}
