import * as constants from './constants';

const MAX_EMAIL_LENGTH = 100;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 25;
const MAX_NAME_LENGTH = 25;
const PASSWORD_REGEX = /^[0-9a-zA-Z]+$/;

export function getUniqueFlashcardUuids (flashcards, repetitions) {
  const flashcardUuids = flashcards.map(flashcard => flashcard.uuid);
  const repetitionFlashcardUuids = repetitions.map(rep => rep.flashcardUuid);
  return [...new Set([...flashcardUuids, ...repetitionFlashcardUuids]).values()];
}

export function validateEmail (email) {
  if (email.length === 0 ||
      email.indexOf('@') === -1) {
    throw ({
      errorCode: constants.SIGNUP_EMAIL_INVALID,
      message: 'Email is invalid (either has a zero length or doesn’t have an @ character.'
    });
  } else if (email.length > MAX_EMAIL_LENGTH) {
    throw ({
      errorCode: constants.SIGNUP_EMAIL_TOO_LONG,
      message: 'Email is too long'
    });
  }
}

export function validatePassword (password) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw ({
      errorCode: constants.SIGNUP_PASSWORD_TOO_SHORT,
      message: 'Password is too short'
    });
  } else if (password.length > MAX_PASSWORD_LENGTH) {
    throw ({
      errorCode: constants.SIGNUP_PASSWORD_TOO_LONG,
      message: 'Password is too long'
    });
  } else if (!password.match(PASSWORD_REGEX)) {
    throw ({
      errorCode: constants.SIGNUP_PASSWORD_INVALID,
      message: 'Password is invalid'
    });
  }
}

export function validateName (name) {
  if (name && name.length > MAX_NAME_LENGTH) {
    throw ({
      errorCode: constants.SIGNUP_NAME_TOO_LONG,
      message: 'Name is too long'
    });
  }
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
