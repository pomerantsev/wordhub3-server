export const ERROR_LOGIN_INCORRECT_DATA = 1;
export const ERROR_EMAIL_INVALID = 2;
export const ERROR_EMAIL_TOO_LONG = 3;
export const ERROR_PASSWORD_TOO_SHORT = 4;
export const ERROR_PASSWORD_TOO_LONG = 5;
export const ERROR_PASSWORD_INVALID = 6;
export const ERROR_NAME_TOO_LONG = 7;
export const ERROR_EXISTING_USER = 8;
export const ERROR_DAILY_LIMIT_INVALID = 9;
export const ERROR_INTERFACE_LANGUAGE_ID_INVALID = 10;
export const ERROR_SYNC = 11;
export const ERROR_TOKEN_EXPIRED = 12;
export const ERROR_SERVER_GENERIC = 13;

export const MAX_EMAIL_LENGTH = 100;
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 25;
export const MAX_NAME_LENGTH = 25;
export const PASSWORD_REGEX = /^[0-9a-zA-Z]+$/;
export const MAX_DAILY_LIMIT = 100;

export const interfaceLanguages = [
  {id: 0, name: 'ru'},
  {id: 1, name: 'en'}
];

export const DEFAULT_INTERFACE_LANGUAGE_ID = 1;
