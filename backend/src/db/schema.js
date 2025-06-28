import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    role: text('role').notNull(), // 'mentor' or 'mentee'
    bio: text('bio'),
    profileImage: text('profile_image'),
    techStack: text('tech_stack'), // JSON string array for mentors (e.g., ["React", "Vue"])
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
  },
  (table) => ({
    emailIdx: index('email_idx').on(table.email),
    roleIdx: index('role_idx').on(table.role),
  })
);

export const matches = sqliteTable(
  'matches',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    mentorId: integer('mentor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    menteeId: integer('mentee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'), // 'pending', 'accepted', 'rejected', 'cancelled'
    message: text('message'),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
  },
  (table) => ({
    mentorIdx: index('mentor_idx').on(table.mentorId),
    menteeIdx: index('mentee_idx').on(table.menteeId),
    statusIdx: index('status_idx').on(table.status),
    createdAtIdx: index('created_at_idx').on(table.createdAt),
  })
);
