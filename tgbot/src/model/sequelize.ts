import { Sequelize } from 'sequelize';

const database = process.env.PG_DATABASE;
const user = process.env.PG_USER;
const password = process.env.PG_PASSWORD;
const host = process.env.PG_HOST;
const port = Number(process.env.PG_PORT);

if (!database || !user || !password || !host || Number.isNaN(port)) {
  throw new Error('[postgres] Missing environment variables');
}

export const sequelize = new Sequelize(database, user, password, {
  host,
  port,
  dialect: 'postgres'
});
