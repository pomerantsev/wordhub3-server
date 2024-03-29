import * as auth from '../data/auth';
import * as constants from '../data/constants';

export default async function LoginRoute (req, res) {
  function sendIncorrectLogin () {
    res.status(401).json({
      errorCode: constants.ERROR_LOGIN_INCORRECT_DATA,
      message: 'Incorrect login data'
    });
  }

  if (!req.body || !req.body.email || !req.body.password) {
    sendIncorrectLogin();
    return;
  }
  try {
    const authInfo = await auth.viaCredentials(req.body.email, req.body.password);
    if (authInfo) {
      res.json({
        token: authInfo.token,
        userId: authInfo.user && authInfo.user.id
      });
    } else {
      sendIncorrectLogin();
    }
  } catch (e) {
    res.status(500).json({
      errorCode: constants.ERROR_SERVER_GENERIC,
      message: e
    });
  }

}
