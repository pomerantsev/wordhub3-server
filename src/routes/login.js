import * as auth from '../data/auth';

export default async function LoginRoute (req, res) {
  function sendIncorrectLogin () {
    res.status(401).json({
      errorCode: 1,
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
    res.status(500).json({error: e});
  }

}
