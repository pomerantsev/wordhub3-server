import * as auth from '../data/auth';

export default async function LoginRoute (req, res) {
  if (!req.body || !req.body.email || !req.body.password) {
    res.status(401).json({message: 'Incorrect login data'});
    return;
  }
  try {
    const token = await auth.viaCredentials(req.body.email, req.body.password);
    if (token) {
      res.json({success: true, token});
    } else {
      res.status(401).json({message: 'Incorrect login data'});
    }
  } catch (e) {
    res.status(500).json({error: e});
  }

}
