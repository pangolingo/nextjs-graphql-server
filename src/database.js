import knex from 'knex';

let dbConnection;

export const initDB = connectionString =>
  knex({
    client: 'pg',
    connection: connectionString,
    debug: false
  });

const getDatabaseConnection = () => {
  return dbConnection || initDB(process.env.PG_CONNECTION_STRING);
};

export default getDatabaseConnection;
