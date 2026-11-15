import { hash, verify } from '@node-rs/argon2';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from './db';
import { sessions, users, type Role, type SessionKind, type User } from './db/schema';

const DAY = 24 * 60 * 60 * 1000;
const LIFETIME: Record<SessionKind, number> = { web: 30 * DAY, launcher: 90 * DAY };
/** Sessions are extended on use once less than this much of their lifetime remains. */
const RENEW_BELOW = 0.5;

export const SESSION_COOKIE = 'takumi_session';

export function cookieOptions(expires: Date) {
  return { path: '/', httpOnly: true, sameSite: 'lax' as const, expires };
}

/** Public view of a user, safe to send to the browser or the launcher. */
export type PublicUser = Pick<User, 'id' | 'username' | 'email' | 'role'>;

export function publicUser(user: User): PublicUser {
  return { id: user.id, username: user.username, email: user.email, role: user.role };
}

export function hashPassword(password: string) {
  return hash(password);
}

/** A hash used to spend the same time verifying when the user does not exist. */
let dummyHash: Promise<string> | undefined;

export async function verifyPassword(passwordHash: string | null, password: string) {
  try {
    const target = passwordHash ?? (await (dummyHash ??= hash('takumi-dummy')));
    const ok = await verify(target, password);
    return ok && passwordHash !== null;
  } catch {
    return false;
  }
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string, kind: SessionKind, label: string | null) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + LIFETIME[kind]);
  await db.insert(sessions).values({ id: hashToken(token), userId, kind, label: label?.slice(0, 200) ?? null, expiresAt });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  return { token, expiresAt };
}

/** Resolve a token to its user; extends the session when it is getting old. */
export async function validateSession(token: string | undefined | null, kind: SessionKind) {
  if (!token || token.length > 100) return null;
  const id = hashToken(token);
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, id), eq(sessions.kind, kind), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row || row.user.bannedAt) return null;

  const now = Date.now();
  const remaining = row.session.expiresAt.getTime() - now;
  const touch: Partial<typeof sessions.$inferInsert> = {};
  if (remaining < LIFETIME[kind] * RENEW_BELOW) touch.expiresAt = new Date(now + LIFETIME[kind]);
  if (now - row.session.lastUsedAt.getTime() > 60 * 60 * 1000 || touch.expiresAt) touch.lastUsedAt = new Date(now);
  if (Object.keys(touch).length) {
    await db.update(sessions).set(touch).where(eq(sessions.id, id));
    Object.assign(row.session, touch);
  }
  return row;
}

export async function deleteSession(token: string) {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export async function deleteSessionById(userId: string, sessionId: string) {
  await db.delete(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
}

export async function deleteUserSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export function sessionIdOf(token: string) {
  return hashToken(token);
}

export async function purgeExpiredSessions() {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

/** Find by username (case-insensitive) or e-mail. */
export async function findUserByLogin(login: string) {
  const value = login.trim();
  const condition = value.includes('@')
    ? eq(users.email, value.toLowerCase())
    : eq(sql`lower(${users.username})`, value.toLowerCase());
  const [user] = await db.select().from(users).where(condition).limit(1);
  return user ?? null;
}

export type LoginResult = { ok: true; user: User } | { ok: false; status: 401 | 403; message: string };

export async function checkCredentials(login: string, password: string): Promise<LoginResult> {
  const user = await findUserByLogin(login);
  const valid = await verifyPassword(user?.passwordHash ?? null, password);
  if (!user || !valid) return { ok: false, status: 401, message: 'Usuario o contraseña incorrectos.' };
  if (user.bannedAt) {
    const reason = user.banReason ? ` Motivo: ${user.banReason}` : '';
    return { ok: false, status: 403, message: `Esta cuenta está suspendida.${reason}` };
  }
  return { ok: true, user };
}

const RANK: Record<Role, number> = { user: 0, editor: 1, admin: 2 };

export function hasRole(user: Pick<User, 'role'> | null | undefined, role: Role) {
  return !!user && RANK[user.role] >= RANK[role];
}

/**
 * Constant-time comparison for shared secrets (CI release token). Both values are hashed first so
 * the comparison takes the same time whatever their lengths, and the secret's length is not revealed.
 */
export function secretMatches(given: string | null | undefined, expected: string | undefined) {
  if (!given || !expected) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(given), digest(expected));
}
