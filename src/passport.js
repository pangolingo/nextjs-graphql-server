import { ExtractJwt } from 'passport-jwt';
import jwt from 'jsonwebtoken';

import { authenticateUser } from './auth';
import getDatabaseConnection from './database';

export const passportAuthenticateUser = async (username, password, cb) => {
  const dbConnection = getDatabaseConnection();
  console.log('authing user via local strategy');
  let user;
  try {
    user = await authenticateUser(dbConnection, username, password);
  } catch (e) {
    return cb(e);
  }
  if (user) {
    return cb(null, user);
  }
  return cb(null, false, { message: 'no user found' });
};

export const getJwtUserVerify = userLoader => {
  const jwtUserVerify = async (jwtPayload, done) => {
    let user;
    try {
      user = await userLoader.load(jwtPayload.sub);
      console.log('jwt strategy got a user', user.email);
    } catch (e) {
      return done(e, false);
    }
    if (!user) {
      return done(null, false, { message: 'no user found' });
    }
    return done(null, user);
  };

  return jwtUserVerify;
};

// if there's a JWT, extract the user and add it to the request
export const getOptionalJwtMiddleware = (jwtSecret, userLoader) => {
  const optionalJwtMiddleware = (req, res, next) => {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!token) {
      return next();
    }
    return jwt.verify(token, jwtSecret, {}, (err, payload) => {
      // payload is the decoded token
      if (err) {
        console.warn('error verifying jwt', token);
        next();
      } else {
        getJwtUserVerify(userLoader)(payload, (err2, user) => {
          // ignore err and info, we just care about saving the user
          req.user = user;
          next();
        });
      }
    });
  };
  return optionalJwtMiddleware;
};
