import dotenv from 'dotenv';
import '@babel/polyfill';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';

import getDatabaseConnection from './database';
import { getUserLoader } from './data/users';
import { authenticateUser } from './auth';
import { typeDefs, resolvers } from './ApolloServer';
import playgroundMiddleware from './customGraphqlPlaygroundMiddleware';

dotenv.config();

// TODO: should also include exp (expiration time) in the JWT

const corsOptions = {}; // use default CORS options
const jwtSecret = 'secret';
const PORT = 4000;

const dbConnection = getDatabaseConnection(process.env.PG_CONNECTION_STRING);
const userLoader = getUserLoader(dbConnection);

const passportAuthenticateUser = async (username, password, cb) => {
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

passport.use(new LocalStrategy(passportAuthenticateUser));

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

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret
    },
    jwtUserVerify
  )
);

const passportLocalAuthMiddleware = passport.authenticate('local', {
  session: false
});
const passportJwtAuthMiddleware = passport.authenticate('jwt', {
  session: false
});

// if there's a JWT, extract the user and add it to the request
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
      jwtUserVerify(payload, (err2, user) => {
        // ignore err and info, we just care about saving the user
        req.user = user;
        next();
      });
    }
  });
};

const context = ({ req }) => {
  return {
    user: req.user,
    db: dbConnection
  };
};

const graphqlServer = new ApolloServer({ typeDefs, resolvers, context });
const app = express();

app.use(cookieParser());
app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(graphqlServer.graphqlPath, optionalJwtMiddleware);

// add GraphQL middleware to app
graphqlServer.applyMiddleware({ app });

// ROUTES

if (app.settings.env === 'development') {
  app.get('/', playgroundMiddleware(graphqlServer.graphqlPath));
}

app.get('/login', function(req, res) {
  res.sendFile(path.join(__dirname, 'src/views/login.html'));
});

app.get('/protected', passportJwtAuthMiddleware, function(req, res) {
  res.send('i am very private');
});

app.post('/playground-login', passportLocalAuthMiddleware, function(req, res) {
  // AUTH SUCCESS
  const token = jwt.sign(
    { sub: req.user.id, email: req.user.email },
    jwtSecret,
    {}
  );
  // set a cookie with the JWT
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  res.cookie('jwt', token, { maxAge, httpOnly: true });
  res.redirect('/');
});

app.post('/login', passportLocalAuthMiddleware, function(req, res) {
  // AUTH SUCCESS
  const json = {
    jwt: jwt.sign({ sub: req.user.id, email: req.user.email }, jwtSecret, {}),
    success: true,
    user: req.user
  };
  res.json(json);
});

app.listen({ port: PORT }, () =>
  console.log(`Server is running on localhost:${PORT}`)
);
