import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { users, matches } from './src/db/schema.js';
import bcrypt from 'bcrypt';

// Create database
const sqlite = new Database('./database.sqlite');
const db = drizzle(sqlite);

// Create tables using the generated SQL from drizzle migration
sqlite.exec(`
CREATE TABLE users (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    bio text,
    profile_image text,
    tech_stack text,
    created_at integer,
    updated_at integer
);
`);

sqlite.exec(`
CREATE TABLE matches (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    mentor_id integer NOT NULL,
    mentee_id integer NOT NULL,
    status text DEFAULT 'pending' NOT NULL,
    message text,
    created_at integer,
    updated_at integer,
    FOREIGN KEY (mentor_id) REFERENCES users(id) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (mentee_id) REFERENCES users(id) ON UPDATE no action ON DELETE cascade
);
`);

// Create indexes
sqlite.exec(`CREATE UNIQUE INDEX users_email_unique ON users (email);`);
sqlite.exec(`CREATE INDEX email_idx ON users (email);`);
sqlite.exec(`CREATE INDEX role_idx ON users (role);`);
sqlite.exec(`CREATE INDEX mentor_idx ON matches (mentor_id);`);
sqlite.exec(`CREATE INDEX mentee_idx ON matches (mentee_id);`);
sqlite.exec(`CREATE INDEX status_idx ON matches (status);`);
sqlite.exec(`CREATE INDEX created_at_idx ON matches (created_at);`);

console.log('Database created successfully!');

// Insert test users for API testing
console.log('Creating test users...');

const saltRounds = 10;

// Test mentor
const mentorPasswordHash = await bcrypt.hash('TestPass123!', saltRounds);
const mentorData = {
  email: 'mentor@test.com',
  passwordHash: mentorPasswordHash,
  name: 'Test Mentor',
  role: 'mentor',
  bio: 'Experienced React developer and mentor',
  techStack: JSON.stringify(['React', 'Node.js', 'JavaScript']),
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Test mentee
const menteePasswordHash = await bcrypt.hash('TestPass456!', saltRounds);
const menteeData = {
  email: 'mentee@test.com',
  passwordHash: menteePasswordHash,
  name: 'Test Mentee',
  role: 'mentee',
  bio: 'Aspiring frontend developer',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Insert test users
try {
  const insertUser = sqlite.prepare(`
    INSERT INTO users (email, password_hash, name, role, bio, tech_stack, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    mentorData.email,
    mentorData.passwordHash,
    mentorData.name,
    mentorData.role,
    mentorData.bio,
    mentorData.techStack,
    mentorData.createdAt.getTime(),
    mentorData.updatedAt.getTime()
  );

  insertUser.run(
    menteeData.email,
    menteeData.passwordHash,
    menteeData.name,
    menteeData.role,
    menteeData.bio,
    null, // mentee doesn't have techStack
    menteeData.createdAt.getTime(),
    menteeData.updatedAt.getTime()
  );

  console.log('Test users created successfully!');
  console.log('- Mentor: mentor@test.com (password: TestPass123!)');
  console.log('- Mentee: mentee@test.com (password: TestPass456!)');
} catch (error) {
  console.error('Error creating test users:', error);
}

sqlite.close();
