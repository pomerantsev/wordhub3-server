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
    console.log(salt, hashedPassword);
    await data.createUser({
      email,
      name,
      hashedPassword,
      salt
    });
    res.sendStatus(201);
  } catch (e) {
    res.status(400).json({error: e.message});
  }
}
