import knex from 'knex';

export default connectionString => knex({
  client: 'pg',
  connection: connectionString,
  debug: false
});
