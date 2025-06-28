import { db } from './src/db/connection.js';
import { users, matches } from './src/db/schema.js';

try {
  // Test database connection
  console.log('Testing database connection...');

  // Try to get count of users
  const userCount = await db.select().from(users);
  console.log('Users table accessible:', userCount.length, 'users found');

  // Try to get count of matches
  const matchCount = await db.select().from(matches);
  console.log('Matches table accessible:', matchCount.length, 'matches found');

  console.log('Database connection test successful!');
} catch (error) {
  console.error('Database connection test failed:', error);
}

process.exit(0);
