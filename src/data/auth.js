import jwt from 'jsonwebtoken';

const secret = 'blah';

const users = [
  {
    email: 'user1@email.com',
    password: 'pass1'
  },
  {
    email: 'user2@email.com',
    password: 'pass2'
  }
];

export function viaCredentials (req, res, next) {
  const foundUser = users.find(user =>
    user.email === req.body.email && user.password === req.body.password);
  if (foundUser) {
    // TODO: Implement token expiration
    const token = jwt.sign(foundUser, secret);
    res.json({
      success: true,
      token
    });
  } else {
    res.status(403).json({success: false, message: 'Email or password incorrect.'})
  }
}

export function viaToken (req, res, next) {
  const token = req.query.token;
  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      res.status(403).json({success: false, message: 'Failed to authenticate token.'});
    } else {
      req.user = decoded;
      next();
    }
  });
}
