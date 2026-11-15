import { env } from '$env/dynamic/private';
import { and, eq, ne, sql } from 'drizzle-orm';
import { checkEmail, checkPassword, checkUsername, normalizeEmail } from '$lib/validation';
import { hashPassword } from './auth';
import { db } from './db';
import { users, type Role } from './db/schema';

export type NewUserInput = {
  username: string;
  email: string;
  password: string;
  role?: Role;
  /** Public sign-up: conflicts get one generic message so it does not reveal which e-mails have accounts. */
  selfService?: boolean;
};

const TAKEN = 'Ese nombre de usuario o correo ya está registrado.';

/** Validates and creates a user. Returns an error message instead of throwing for user mistakes. */
export async function createUser(input: NewUserInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const username = input.username.trim();
  const email = normalizeEmail(input.email);
  const problem = checkUsername(username) ?? checkEmail(email) ?? checkPassword(input.password);
  if (problem) return { ok: false, error: problem };

  if (input.selfService && (await reservedForFirstAdmin(username, email))) return { ok: false, error: TAKEN };
  const taken = await findConflict(username, email);
  if (taken) return { ok: false, error: input.selfService ? TAKEN : taken };

  try {
    const [row] = await db
      .insert(users)
      .values({ username, email, passwordHash: await hashPassword(input.password), role: input.role ?? 'user' })
      .returning({ id: users.id });
    return { ok: true, id: row.id };
  } catch {
    // Lost a race against another registration with the same name/e-mail.
    return { ok: false, error: TAKEN };
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

/** The first administrator's identity (from the environment). */
export function firstAdminIdentity() {
  return {
    username: env.ADMIN_USERNAME?.trim() || 'admin',
    email: normalizeEmail(env.ADMIN_EMAIL || 'admin@takumilabs.org'),
  };
}

/**
 * While the site has no administrator yet, nobody can sign up with the name or e-mail reserved
 * for the first one; otherwise the account created from ADMIN_* on the next start would collide.
 */
async function reservedForFirstAdmin(username: string, email: string) {
  const reserved = firstAdminIdentity();
  if (username.toLowerCase() !== reserved.username.toLowerCase() && email !== reserved.email) return false;
  const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin')).limit(1);
  return !admin;
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Runs `change` unless it would leave the site without an active (not suspended) administrator.
 * The admin rows are locked while checking and changing, so two admins acting on each other at the
 * same time cannot both pass the check. Returns false when the change was refused.
 */
export function guardLastAdmin(targetId: string, removesAdmin: boolean, change: (tx: Transaction) => Promise<unknown>) {
  return db.transaction(async (tx) => {
    if (removesAdmin) {
      const admins = await tx
        .select({ id: users.id, bannedAt: users.bannedAt })
        .from(users)
        .where(eq(users.role, 'admin'))
        .for('update');
      const active = admins.filter((admin) => !admin.bannedAt);
      if (active.length <= 1 && active.some((admin) => admin.id === targetId)) return false;
    }
    await change(tx);
    return true;
  });
}
