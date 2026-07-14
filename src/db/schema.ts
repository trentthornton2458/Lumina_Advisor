import { relations } from 'drizzle-orm';
import { pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

// Define the 'users' table.
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
