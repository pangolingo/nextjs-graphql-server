import { gql } from 'apollo-server-express';

import { fetchAllTeams, fetchTeam, fetchUsersByTeamId } from './data/teams';
import { fetchCommentsByUserId, fetchAuthorByCommentId } from './data/comments';
import { fetchHighFivesByUserId } from './data/high-fives';
import { fetchCurrentUser, fetchUserById } from './data/users';

export const typeDefs = gql`
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
    name: String
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
`;

export const resolvers = {
  Query: {
    hello: (_, { name }) => `Hello ${name || 'World'}`,
    viewer: (_, __, ctx) => fetchCurrentUser(ctx),
    teams: (_, __, ctx) => fetchAllTeams(ctx.db),
    team: (_, { id }, ctx) => fetchTeam(ctx.db, ctx, id),
    user: (_, { id }, ctx) => fetchUserById(ctx.db, id)
  },
  // HighFive: {

  // },
  Comment: {
    author: (comment, args, ctx) => {
      if (comment.authorId) {
        return fetchUserById(comment.authorId);
      }
      return fetchAuthorByCommentId(ctx.db, comment.id);
    }
  },
  User: {
    highFives: (user, _, ctx) => fetchHighFivesByUserId(ctx.db, user.id),
    comments: (user, _, ctx) => fetchCommentsByUserId(ctx.db, user.id)
  },
  Team: {
    users: (team, _, ctx) => {
      return fetchUsersByTeamId(ctx.db, team.id);
    }
  }
};
