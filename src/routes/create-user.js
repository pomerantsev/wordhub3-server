import * as data from '../data/data';
import * as helpers from '../data/helpers';
import * as auth from '../data/auth';
import * as constants from '../data/constants';

export default async function CreateUserRoute (req, res) {
  try {
    const email = req.body.email && req.body.email.toLowerCase();
    const password = req.body.password;
    const name = req.body.name;
    try {
      helpers.validateEmail(email);
      helpers.validatePassword(password);
      helpers.validateName(name);
    } catch (e) {
      res.status(403).json({
        errorCode: e.errorCode,
        message: e.message
      });
      return;
    }
    const foundUser = await data.getUserByEmail(email);
    if (foundUser) {
      res.status(403).json({
        errorCode: constants.SIGNUP_EXISTING_USER,
        message: 'User exists.'
      });
      return;
    }

    const salt = auth.generateSalt(email);
    const hashedPassword = auth.hashPassword(password, salt);
    const interfaceLanguageCd = helpers.getLanguageEnum(req.body.language);
    await data.createUser({
      email,
      name,
      hashedPassword,
      salt,
      interfaceLanguageCd
    });
    const authInfo = await auth.viaCredentials(email, password);
    if (authInfo) {
      res.status(201).json({
        token: authInfo.token,
        userId: authInfo.user && authInfo.user.id
      });
    } else {
      // We shouldn't be getting here - it means that
      // the user has been created but cannot be found.
      res.status(500);
    }
  } catch (e) {
    res.status(500).json({error: e.message});
  }
}
