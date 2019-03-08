import dotenv from 'dotenv';
import "@babel/polyfill";
import { GraphQLServer } from 'graphql-yoga';
import knex from 'knex';
import DataLoader from 'dataloader';
import _ from 'lodash';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import { Strategy as JwtStrategy, ExtractJwt} from 'passport-jwt';
import cors from 'cors';

dotenv.config();

import { fetchAllTeams, fetchTeam, fetchUsersByTeamId } from './src/data/teams';
import { fetchCurrentUser, fetchUserById, getUserLoader } from './src/data/users';
import { fetchCommentsByUserId, fetchAuthorByCommentId } from './src/data/comments';
import { fetchHighFivesByUserId } from './src/data/high-fives';
import { authenticateUser } from './src/auth';

const conn = knex({
  client: 'pg',
  connection: process.env.PG_CONNECTION_STRING,
  debug: true
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
    viewer: (_, __, context) => fetchCurrentUser(context.user),
    teams: () => fetchAllTeams(conn),
    team: (_, { id }) => fetchTeam(conn, id),
    user: (_, { id }) => fetchUserById(conn, id)
  },
  // HighFive: {
    
  // },
  Comment: {
    author: (comment, args, context, info) => {
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


passport.use(new JwtStrategy(opts, async function(jwtPayload, done) {
  console.log('find payload', jwtPayload);
  let user;
  try {
    user = await userLoader.load(jwtPayload.sub);
    console.log('jwt strategy got a user', user)
  } catch(e) {
    return done(e, false);
  }
  if(!user){
    return done(err, false, {message: 'no user found'});
  }
  return done(null, user)
}));


const passportLocalAuth = passport.authenticate('local', { session: false })
const passportJwtAuth = passport.authenticate('jwt', { session: false })

const context = req => {
  return {
    user: req.request.user
  }
};

const server = new GraphQLServer({ typeDefs, resolvers, context });

// yoga only configures cores for its standard routes
// we need this global declaration if we want it to work for our manual routes
server.express.use(cors(corsOptions))

server.express.use(bodyParser.urlencoded({ extended: true }));
server.express.use(passport.initialize());

server.express.get('/login', function(req, res) {
  res.send('hello')
})

server.express.get('/protected', passportJwtAuth, function(req, res) {
  res.send('i am very private')
})

server.express.post('/login',
passportLocalAuth,
  function(req, res) {
    // If this function gets called, authentication was successful.
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
// server.express.post(server.options.endpoint, passportJwtAuth)


const serverOptions = {
  cors: corsOptions
}

server.start(serverOptions,() => console.log('Server is running on localhost:4000'))