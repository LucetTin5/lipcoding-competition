import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.js',
  out: './src/db/migrations',
  dialect: 'sqlite',
  driver: 'better-sqlite',
  dbCredentials: {
    url: './database.sqlite',
  },
  verbose: true,
  strict: true,
});
