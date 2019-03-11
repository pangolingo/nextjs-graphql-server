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

import {
  passportAuthenticateUser,
  getJwtUserVerify,
  getOptionalJwtMiddleware
} from './passport';
import getDatabaseConnection from './database';
import { getUserLoader } from './data/users';

import { typeDefs, resolvers } from './ApolloServer';
import playgroundMiddleware from './customGraphqlPlaygroundMiddleware';

dotenv.config();

// TODO: should also include exp (expiration time) in the JWT

const corsOptions = {}; // use default CORS options
const jwtSecret = process.env.JWT_SECRET;
const PORT = 4000;

const dbConnection = getDatabaseConnection();
const userLoader = getUserLoader(dbConnection);

passport.use(new LocalStrategy(passportAuthenticateUser));
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret
    },
    getJwtUserVerify(userLoader)
  )
);
const passportLocalAuthMiddleware = passport.authenticate('local', {
  session: false
});
const passportJwtAuthMiddleware = passport.authenticate('jwt', {
  session: false
});

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
app.use(
  graphqlServer.graphqlPath,
  getOptionalJwtMiddleware(jwtSecret, userLoader)
);

// add GraphQL middleware to app
graphqlServer.applyMiddleware({ app });

// ROUTES

if (app.settings.env === 'development') {
  app.get('/', playgroundMiddleware(graphqlServer.graphqlPath));
}

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/login.html'));
});

app.get('/protected', passportJwtAuthMiddleware, (req, res) => {
  res.send('i am very private');
});

app.post('/playground-login', passportLocalAuthMiddleware, (req, res) => {
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

app.post('/login', passportLocalAuthMiddleware, (req, res) => {
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
