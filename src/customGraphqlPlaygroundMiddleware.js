import expressPlayground from 'graphql-playground-middleware-express'

/**
 * pull the JWT from the cookie and add it as a header in the playground
 */
const customPlaygroundMiddleware = (endpoint) => (req, res, next) => {
  const headers = {}
  if( req.cookies.jwt ){
    headers['Authorization'] = `Bearer ${req.cookies.jwt}`;
  }
  const options = { endpoint, headers };
  return expressPlayground(options)(req, res, next);
}

export default customPlaygroundMiddleware;