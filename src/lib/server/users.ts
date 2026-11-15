import { and, eq, ne, sql } from 'drizzle-orm';
import { checkEmail, checkPassword, checkUsername, normalizeEmail } from '$lib/validation';
import { hashPassword } from './auth';
import { db } from './db';
import { users, type Role } from './db/schema';

export type NewUserInput = { username: string; email: string; password: string; role?: Role };

/** Validates and creates a user. Returns an error message instead of throwing for user mistakes. */
export async function createUser(input: NewUserInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const username = input.username.trim();
  const email = normalizeEmail(input.email);
  const problem = checkUsername(username) ?? checkEmail(email) ?? checkPassword(input.password);
  if (problem) return { ok: false, error: problem };

  const taken = await findConflict(username, email);
  if (taken) return { ok: false, error: taken };

  try {
    const [row] = await db
      .insert(users)
      .values({ username, email, passwordHash: await hashPassword(input.password), role: input.role ?? 'user' })
      .returning({ id: users.id });
    return { ok: true, id: row.id };
  } catch {
    // Lost a race against another registration with the same name/e-mail.
    return { ok: false, error: 'Ese nombre de usuario o correo ya está registrado.' };
  }
}

/** Message if the username or e-mail is used by another account. */
export async function findConflict(username: string, email: string, exceptId?: string) {
  const notSelf = exceptId ? ne(users.id, exceptId) : undefined;
  const [byName] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(sql`lower(${users.username})`, username.toLowerCase()), notSelf))
    .limit(1);
  if (byName) return 'Ese nombre de usuario ya está en uso.';
  const [byEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), notSelf))
    .limit(1);
  if (byEmail) return 'Ya existe una cuenta con ese correo.';
  return null;
}

export async function countAdmins() {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, 'admin'));
  return count;
}
