import sha1 from 'sha1';
import jwt from 'jsonwebtoken';

import * as data from './data';

export async function viaCredentials (email, password) {
  const foundUser = await data.getUserByEmail(email);
  // const foundUser = users.find(user => user.email === email);
  if (foundUser) {
    // This branching is here for historical reasons.
    if (foundUser.salt && foundUser.hashedPassword === sha1(`Put ${foundUser.salt} on the ${password}`) ||
        foundUser.hashedPassword === sha1(password)) {
      // TODO: Implement token expiration
      return jwt.sign(foundUser, process.env.JWT_SECRET);
    } else {
      return null;
    }
  } else {
    return null;
  }
}

export function viaToken (req, res, next) {
  const token = req.query.token;
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      res.status(403).json({success: false, message: 'Failed to authenticate token.'});
    } else {
      req.user = decoded;
      next();
    }
  });
}
