import dotenv from 'dotenv';
import "@babel/polyfill";
// import { GraphQLServer } from 'graphql-yoga';
import express from 'express';
import {ApolloServer, gql} from 'apollo-server-express';
import expressPlayground from 'graphql-playground-middleware-express'
import knex from 'knex';
import DataLoader from 'dataloader';
import _ from 'lodash';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import { Strategy as JwtStrategy, ExtractJwt} from 'passport-jwt';
import cors from 'cors';
import jsonwebtoken from 'jsonwebtoken';
import path from 'path';
import cookieParser from 'cookie-parser';

dotenv.config();

import { fetchAllTeams, fetchTeam, fetchUsersByTeamId } from './src/data/teams';
import { fetchCurrentUser, fetchUserById, getUserLoader } from './src/data/users';
import { fetchCommentsByUserId, fetchAuthorByCommentId } from './src/data/comments';
import { fetchHighFivesByUserId } from './src/data/high-fives';
import { authenticateUser } from './src/auth';

const conn = knex({
  client: 'pg',
  connection: process.env.PG_CONNECTION_STRING,
  debug: false
});


const corsOptions = {}; // use default CORS options








const userLoader = getUserLoader(conn);


const typeDefs = `
  type HighFive {
    id: ID!
    author: User!
  }
  type Comment {
    id: ID!
    author: User!
    body: String!
  }
  type User {
    id: ID!
    firstName: String
    lastName: String
    fullName: String
    email: String!
    role: String
    city: String
    state: String
    jobTitle: String
    highFives: [HighFive!]
    comments: [Comment!]
  }
  type Team {
    id: ID!
    name: String,
    users: [User!]
  }
  type Query {
    hello(name: String): String!
    viewer: User
    teams: [Team!]
    team(id: ID!): Team
    user(id: ID!): User
  }


  schema {
    query: Query
  }
`


















const resolvers = {
  Query: {
    hello: (_, { name }) => `Hello ${name || 'World'}`,
    viewer: (_, __, ctx) => fetchCurrentUser(ctx),
    teams: () => fetchAllTeams(conn),
    team: (_, { id }, ctx) => fetchTeam(conn, ctx, id),
    user: (_, { id }) => fetchUserById(conn, id)
  },
  // HighFive: {
    
  // },
  Comment: {
    author: (comment, args, ctx, info) => {
      if(comment.authorId){
        return fetchUserById(comment.authorId);
      }
      return fetchAuthorByCommentId(conn, comment.id);
    }
  },
  User: {
    highFives: (user) => fetchHighFivesByUserId(conn, user.id),
    comments: (user) => fetchCommentsByUserId(conn, user.id)
  },
  Team: {
    users: (team) => {
      return fetchUsersByTeamId(conn, team.id);
    }
  }
}




passport.use(new LocalStrategy(
  async function(username, password, cb) {
    console.log('authing user via local strategy')
    let user;
    try {
      user = await authenticateUser(conn, username, password);
    } catch(e) {
      return cb(e);
    }
    if(user){
      return cb(null, user);
    }
    return cb(null, false, {message: 'no user found'});
  }));


var opts = {}
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = 'secret';


const jwtUserVerify = async (jwtPayload, done) => {
  console.log("NON optional vieryfing", jwtPayload)
  // console.log('find payload', jwtPayload);
  let user;
  try {
    user = await userLoader.load(jwtPayload.sub);
    console.log('jwt strategy got a user', user.email)
  } catch(e) {
    return done(e, false);
  }
  if(!user){
    return done(err, false, {message: 'no user found'});
  }
  return done(null, user)
}

passport.use(new JwtStrategy(opts, jwtUserVerify));


const passportLocalAuth = passport.authenticate('local', { session: false })
const passportJwtAuth = passport.authenticate('jwt', { session: false })

const optionalJwtMiddleware = (req, res, next) => {
  const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  console.log('optional middleware', token);
  if(!token){
    return next();
  }
  return jwt.verify(token, opts.secretOrKey, {}, (err, payload) => {
    if(err){
      console.warn('error verifying jwt', token)
      next();
    } else {
      jwtUserVerify(payload, (err, user, info) => {
        // ignore err and info, we just care about saving the user
        console.log('was user verified?', user)
        req.user = user;
        next();
      })
    }


    console.log('decoded token', payload)
  });
}



const context = ({req}) => {
  return {
    user: req.user
  }
};


const PORT = 4000;
const app = express();
const server = new ApolloServer({typeDefs, resolvers, context});

app.use(cookieParser());
app.use(cors(corsOptions))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());

app.get('/login', function(req, res) {
  // res.send('hello')
  res.sendFile(path.join(__dirname, 'src/views/login.html'))
})

app.get('/protected', passportJwtAuth, function(req, res) {
  res.send('i am very private')
})

// app.use(server.graphqlPath, passportJwtAuth)
app.use(server.graphqlPath, optionalJwtMiddleware)

server.applyMiddleware({app})



const alteredExpressPlaygroundMiddleware = (req, res, next) => {
  const headers = {}
  // if( req.query.jwt ){
  //   headers['Authorization'] = `Bearer ${req.query.jwt}`;
  // }
  if( req.cookies.jwt ){
    headers['Authorization'] = `Bearer ${req.cookies.jwt}`;
  }
  const options = { endpoint: server.graphqlPath, headers };
  return expressPlayground(options)(req, res, next);
}

if(app.settings.env === 'development'){
  app.get('/', alteredExpressPlaygroundMiddleware)
}

app.post('/playground-login',
  passportLocalAuth,
  function(req, res) {
    // If this function gets called, authentication was successful.ygr
    // `req.user` contains the authenticated user.
    // res.redirect('/users/' + req.user.username);
    console.log('AUTH SUCCESS');
    const token = jwt.sign({ sub: req.user.id, email: req.user.email }, opts.secretOrKey, {
      // issuer: opts.issuer
    });
    // res.redirect(`/?jwt=${token}`);
    const maxAge = 7 * 24 * 60 * 60 // 7 days in seconds
    res.cookie('jwt', token, { maxAge, httpOnly: true });
    res.redirect('/');
  });

app.post('/login',
  passportLocalAuth,
  function(req, res) {
    // If this function gets called, authentication was successful.ygr
    // `req.user` contains the authenticated user.
    // res.redirect('/users/' + req.user.username);
    console.log('AUTH SUCCESS');
    const json = {
      jwt: jwt.sign({ sub: req.user.id, email: req.user.email }, opts.secretOrKey, {
        // issuer: opts.issuer
      }),
      // todo: should also include exp (expiration time)
      success: true,
      user: req.user
    }
    res.json(json);
  });

// temporarily remove any auth middleware
// app.post(server.graphqlPath, passportJwtAuth)

// middleware should find JWT if it exists, finde the user, and set that user


app.listen({port: PORT}, () => console.log('Server is running on localhost:4000'));
