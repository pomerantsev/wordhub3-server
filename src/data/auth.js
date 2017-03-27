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

export function generateSalt (email) {
  return sha1(`Use ${email} with ${Date.now()} to make salt`);
}

export async function viaCredentials (email, password) {
  const foundUser = await data.getUserByEmail(email);
  if (foundUser) {
    if (foundUser.hashedPassword === hashPassword(password, foundUser.salt)) {
      return {
        user: foundUser,
        token: jwt.sign({id: foundUser.id}, process.env.JWT_SECRET, {
          expiresIn: '30 days'
        })
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
      res.status(401).json({success: false, message: 'Failed to authenticate token.'});
    } else {
      const user = await data.getUserById(decoded.id);
      if (user) {
        req.user = user;
        next();
      } else {
        res.status(401).json({success: false, message: 'Failed to authenticate token.'});
      }
    }
  });
}
