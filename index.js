import { GraphQLServer } from 'graphql-yoga'

const typeDefs = `
  type HighFive {
    id: String!
    author: User!
  }
  type Comment {
    id: String!
    author: User!
    body: String!
  }
  type User {
    id: String!
    firstName: String
    lastName: String
    fullName: String
    role: String
    city: String
    state: String
    highFives: [HighFive!]
    comments: [Comment!]
  }
  type Query {
    hello(name: String): String!
    viewer: User!
  }
`

const myUser = {
  id: '123',
  firstName: 'Dave',
  lastName: 'Iverson',
  fullName: 'Dave Iverson',
  role: 'participant',
  city: 'Rochester',
  state: 'Minnesota',
  highFives: [],
  comments: []
}

const resolvers = {
  Query: {
    hello: (_, { name }) => `Hello ${name || 'World'}`,
    viewer: () => myUser,
  },
}

const server = new GraphQLServer({ typeDefs, resolvers })
server.start(() => console.log('Server is running on localhost:4000'))