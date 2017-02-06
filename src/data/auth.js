import sha1 from 'sha1';
import jwt from 'jsonwebtoken';

import * as data from './data';

export function hashPassword (password, salt) {
  // This branching is here for historical reasons.
  if (salt) {
    return sha1(`Put ${salt} on the ${password}`);
  } else {
    return sha1(password);
  }
}

export function hashWithoutSalt (password) {
  return sha1(password);
}

export async function viaCredentials (email, password) {
  const foundUser = await data.getUserByEmail(email);
  if (foundUser) {
    if (foundUser.hashedPassword === hashPassword(password, foundUser.salt)) {
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
