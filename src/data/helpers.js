import * as constants from './constants';

export function getUniqueFlashcardUuids (flashcards, repetitions) {
  const flashcardUuids = flashcards.map(flashcard => flashcard.uuid);
  const repetitionFlashcardUuids = repetitions.map(rep => rep.flashcardUuid);
  return [...new Set([...flashcardUuids, ...repetitionFlashcardUuids]).values()];
}

export function validateEmail (email) {
  if (email.length === 0 ||
      email.indexOf('@') === -1) {
    throw ({
      errorCode: constants.ERROR_EMAIL_INVALID,
      message: 'Email is invalid (either has a zero length or doesn’t have an @ character.'
    });
  } else if (email.length > constants.MAX_EMAIL_LENGTH) {
    throw ({
      errorCode: constants.ERROR_EMAIL_TOO_LONG,
      message: 'Email is too long'
    });
  }
}

export function validatePassword (password) {
  if (password.length < constants.MIN_PASSWORD_LENGTH) {
    throw ({
      errorCode: constants.ERROR_PASSWORD_TOO_SHORT,
      message: 'Password is too short'
    });
  } else if (password.length > constants.MAX_PASSWORD_LENGTH) {
    throw ({
      errorCode: constants.ERROR_PASSWORD_TOO_LONG,
      message: 'Password is too long'
    });
  } else if (!password.match(constants.PASSWORD_REGEX)) {
    throw ({
      errorCode: constants.ERROR_PASSWORD_INVALID,
      message: 'Password is invalid'
    });
  }
}

export function validateName (name) {
  if (name && name.length > constants.MAX_NAME_LENGTH) {
    throw ({
      errorCode: constants.ERROR_NAME_TOO_LONG,
      message: 'Name is too long'
    });
  }
}

export function validateDailyLimit (dailyLimit) {
  if (!(Number(dailyLimit) > 0) ||
      !(Number(dailyLimit) <= constants.MAX_DAILY_LIMIT) ||
      Math.floor(dailyLimit) !== dailyLimit) {
    throw ({
      errorCode: constants.ERROR_DAILY_LIMIT_INVALID,
      message: 'Daily limit is invalid'
    });
  }
}

export function validateInterfaceLanguageId (interfaceLanguageId) {
  if (!constants.interfaceLanguages
        .find(language => language.id === interfaceLanguageId)) {
    throw ({
      errorCode: constants.ERROR_INTERFACE_LANGUAGE_ID_INVALID,
      message: 'Interface language id is invalid'
    });
  }
}

export function getLanguageEnum (name) {
  const foundLanguage = constants.interfaceLanguages
    .find(language => language.name === name);
  return foundLanguage ?
    foundLanguage.id :
    constants.DEFAULT_INTERFACE_LANGUAGE_ID;
}

export function getUserSettings (user) {
  return {
    dailyLimit: user.dailyLimit,
    name: user.name,
    interfaceLanguageId: user.interfaceLanguageId
  };
}
