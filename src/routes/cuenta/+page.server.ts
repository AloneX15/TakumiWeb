import { fail } from '@sveltejs/kit';
import { and, desc, eq, ne } from 'drizzle-orm';
import { deleteSessionById, hashPassword, verifyPassword } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { sessions, users } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/guards';
import { findConflict } from '$lib/server/users';
import { checkEmail, checkPassword, normalizeEmail } from '$lib/validation';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  const [profile] = await db
    .select({ createdAt: users.createdAt, lastLoginAt: users.lastLoginAt })
    .from(users)
    .where(eq(users.id, user.id));
  const list = await db
    .select({
      id: sessions.id,
      kind: sessions.kind,
      label: sessions.label,
      createdAt: sessions.createdAt,
      lastUsedAt: sessions.lastUsedAt,
    })
    .from(sessions)
    .where(eq(sessions.userId, user.id))
    .orderBy(desc(sessions.lastUsedAt));
  return {
    profile,
    sessions: list.map((s) => ({ ...s, current: s.id === event.locals.sessionId })),
    welcome: event.url.searchParams.has('bienvenida'),
  };
};

async function checkCurrentPassword(userId: string, password: string) {
  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, userId));
  return !!row && (await verifyPassword(row.hash, password));
}

export const actions: Actions = {
  email: async (event) => {
    const user = requireUser(event);
    const form = await event.request.formData();
    const email = normalizeEmail(String(form.get('email') ?? ''));
    const problem = checkEmail(email);
    if (problem) return fail(400, { action: 'email', error: problem });
    if (!(await checkCurrentPassword(user.id, String(form.get('password') ?? '')))) {
      return fail(400, { action: 'email', error: 'La contraseña actual no es correcta.' });
    }
    const conflict = await findConflict(user.username, email, user.id);
    if (conflict) return fail(400, { action: 'email', error: conflict });
    await db.update(users).set({ email }).where(eq(users.id, user.id));
    return { action: 'email', success: 'Correo actualizado.' };
  },

  password: async (event) => {
    const user = requireUser(event);
    const form = await event.request.formData();
    const next = String(form.get('new') ?? '');
    if (next !== String(form.get('confirm') ?? '')) {
      return fail(400, { action: 'password', error: 'Las contraseñas nuevas no coinciden.' });
    }
    const problem = checkPassword(next);
    if (problem) return fail(400, { action: 'password', error: problem });
    if (!(await checkCurrentPassword(user.id, String(form.get('current') ?? '')))) {
      return fail(400, { action: 'password', error: 'La contraseña actual no es correcta.' });
    }
    await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, user.id));
    // Sign out everywhere else (launchers included) after a password change.
    if (event.locals.sessionId) {
      await db.delete(sessions).where(and(eq(sessions.userId, user.id), ne(sessions.id, event.locals.sessionId)));
    }
    return { action: 'password', success: 'Contraseña cambiada. Se han cerrado tus otras sesiones.' };
  },

  revoke: async (event) => {
    const user = requireUser(event);
    const id = String((await event.request.formData()).get('id') ?? '');
    if (id && id !== event.locals.sessionId) await deleteSessionById(user.id, id);
    return { action: 'sessions', success: 'Sesión cerrada.' };
  },

  revokeOthers: async (event) => {
    const user = requireUser(event);
    if (event.locals.sessionId) {
      await db.delete(sessions).where(and(eq(sessions.userId, user.id), ne(sessions.id, event.locals.sessionId)));
    }
    return { action: 'sessions', success: 'Se han cerrado todas tus otras sesiones.' };
  },
};
