import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string) {
  // Use upsert to handle concurrent inserts of the same user ID safely.
  // Updates email if the user already exists, or inserts a new record.
  const result = await db.insert(users)
    .values({
      uid,
      email,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
      },
    })
    .returning();

  return result[0];
}

export async function getUser(uid: string) {
    const result = await db.select().from(users).where(eq(users.uid, uid));
    return result[0];
}
