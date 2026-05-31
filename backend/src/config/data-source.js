const dotenv = require('dotenv');
dotenv.config();

const { DataSource } = require('typeorm');
const path = require('path');

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DB_EXTERNAL_CONNECTION_STRING || process.env.DATABASE_URL,
  synchronize: process.env.NODE_ENV !== 'production', // Auto-sync in dev — disable in production
  logging: process.env.NODE_ENV === 'development',
  entities: [path.join(__dirname, '..', 'entities', '*.js')],
  ssl: {
    rejectUnauthorized: false, // Required for Render PostgreSQL
  },
});

module.exports = { AppDataSource };
