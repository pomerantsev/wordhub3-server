import * as data from '../data/data';
import * as helpers from '../data/helpers';
import * as auth from '../data/auth';

export default async function CreateUserRoute (req, res) {
  try {
    const email = req.body.email && req.body.email.toLowerCase();
    const password = req.body.password;
    const name = req.body.name;
    if (!helpers.emailIsValid(email) ||
        !helpers.passwordIsValid(password) ||
        !helpers.nameIsValid(name)) {
      res.status(403).json({error: 'Invalid data'});
      return;
    }
    const foundUser = await data.getUserByEmail(email);
    if (foundUser) {
      res.status(403).json({error: 'User exists'});
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
      res.json({
        token: authInfo.token,
        userId: authInfo.user && authInfo.user.id
      });
    } else {
      // We shouldn't be getting here - it means that
      // the user has been created but cannot be found.
      res.status(500);
    }
  } catch (e) {
    res.status(400).json({error: e.message});
  }
}
