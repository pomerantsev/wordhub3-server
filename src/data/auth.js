import sha1 from 'sha1';
import jwt from 'jsonwebtoken';

import * as data from './data';
import * as constants from './constants';

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

export function generateSalt (email) {
  return sha1(`Use ${email} with ${Date.now()} to make salt`);
}

export async function viaCredentials (email, password) {
  const foundUser = await data.getUserByEmail(email);
  if (foundUser) {
    if (foundUser.hashedPassword === hashPassword(password, foundUser.salt)) {
      return {
        user: foundUser,
        token: jwt.sign({id: foundUser.id}, process.env.JWT_SECRET)
      };
    } else {
      return null;
    }
  } else {
    return null;
  }
}

export function viaToken (req, res, next) {
  const token = req.query.token;
  jwt.verify(token, process.env.JWT_SECRET, async function (err, decoded) {
    if (err) {
      // Issue a 'Token expired' if token is invalid,
      // because that's most likely what it is.
      res.status(401).json({
        errorCode: constants.ERROR_TOKEN_EXPIRED,
        message: 'Failed to authenticate token.'
      });
    } else {
      const user = await data.getUserById(decoded.id);
      if (user) {
        req.user = user;
        next();
      } else {
        // We also issue a 'Token expired' error if user doesn't exist any more
        res.status(401).json({
          errorCode: constants.ERROR_TOKEN_EXPIRED,
          message: 'Failed to authenticate token.'
        });
      }
    }
  });
}
