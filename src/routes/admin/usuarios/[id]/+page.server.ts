import { error, fail, redirect } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import { deleteSessionById, deleteUserSessions, hashPassword } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { posts, sessions, users, type Role } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/guards';
import { findConflict, guardLastAdmin } from '$lib/server/users';
import { checkEmail, checkPassword, checkUsername, normalizeEmail } from '$lib/validation';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

const UUID = /^[0-9a-f-]{36}$/i;
const ROLES: Role[] = ['user', 'editor', 'admin'];

async function target(event: RequestEvent) {
  const admin = requireUser(event, 'admin');
  const id = event.params.id;
  const [user] = UUID.test(id) ? await db.select().from(users).where(eq(users.id, id)).limit(1) : [];
  if (!user) error(404, 'Este usuario no existe.');
  return { admin, user, self: admin.id === user.id };
}

const LAST_ADMIN = 'Debe quedar al menos un administrador activo.';

export const load: PageServerLoad = async (event) => {
  const { user, self } = await target(event);
  const [userSessions, [{ postCount }]] = await Promise.all([
    db
      .select({
        id: sessions.id,
        kind: sessions.kind,
        label: sessions.label,
        lastUsedAt: sessions.lastUsedAt,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .where(eq(sessions.userId, user.id))
      .orderBy(desc(sessions.lastUsedAt)),
    db.select({ postCount: sql<number>`count(*)::int` }).from(posts).where(eq(posts.authorId, user.id)),
  ]);
  return {
    target: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      bannedAt: user.bannedAt,
      banReason: user.banReason,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    },
    self,
    sessions: userSessions,
    postCount,
    created: event.url.searchParams.has('creado'),
  };
};

export const actions: Actions = {
  profile: async (event) => {
    const { user, self } = await target(event);
    const form = await event.request.formData();
    const username = String(form.get('username') ?? '').trim();
    const email = normalizeEmail(String(form.get('email') ?? ''));
    const rawRole = String(form.get('role') ?? user.role) as Role;
    const role = ROLES.includes(rawRole) ? rawRole : user.role;

    const problem = checkUsername(username) ?? checkEmail(email);
    if (problem) return fail(400, { action: 'profile', error: problem });
    const conflict = await findConflict(username, email, user.id);
    if (conflict) return fail(400, { action: 'profile', error: conflict });
    if (role !== user.role && self) return fail(400, { action: 'profile', error: 'No puedes cambiar tu propio rol.' });
    const demotesAdmin = user.role === 'admin' && role !== 'admin';
    const saved = await guardLastAdmin(user.id, demotesAdmin, (tx) =>
      tx.update(users).set({ username, email, role }).where(eq(users.id, user.id)),
    );
    if (!saved) return fail(400, { action: 'profile', error: LAST_ADMIN });
    return { action: 'profile', success: 'Datos guardados.' };
  },

  password: async (event) => {
    const { user } = await target(event);
    const form = await event.request.formData();
    const password = String(form.get('password') ?? '');
    const problem = checkPassword(password);
    if (problem) return fail(400, { action: 'password', error: problem });
    await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, user.id));
    if (form.get('logout') === 'on') await deleteUserSessions(user.id);
    return { action: 'password', success: 'Contraseña cambiada.' };
  },

  ban: async (event) => {
    const { user, self } = await target(event);
    if (self) return fail(400, { action: 'ban', error: 'No puedes suspender tu propia cuenta.' });
    const reason = String((await event.request.formData()).get('reason') ?? '').trim().slice(0, 300) || null;
    const banned = await guardLastAdmin(user.id, user.role === 'admin', (tx) =>
      tx.update(users).set({ bannedAt: new Date(), banReason: reason }).where(eq(users.id, user.id)),
    );
    if (!banned) return fail(400, { action: 'ban', error: LAST_ADMIN });
    // A suspended account is signed out of the web and every launcher.
    await deleteUserSessions(user.id);
    return { action: 'ban', success: 'Cuenta suspendida y sesiones cerradas.' };
  },

  unban: async (event) => {
    const { user } = await target(event);
    await db.update(users).set({ bannedAt: null, banReason: null }).where(eq(users.id, user.id));
    return { action: 'ban', success: 'Suspensión retirada.' };
  },

  revoke: async (event) => {
    const { user } = await target(event);
    const id = String((await event.request.formData()).get('id') ?? '');
    if (id && id !== event.locals.sessionId) await deleteSessionById(user.id, id);
    return { action: 'sessions', success: 'Sesión cerrada.' };
  },

  revokeAll: async (event) => {
    const { user, self } = await target(event);
    if (self) return fail(400, { action: 'sessions', error: 'Usa «Mi cuenta» para cerrar tus propias sesiones.' });
    await deleteUserSessions(user.id);
    return { action: 'sessions', success: 'Todas las sesiones cerradas.' };
  },

  delete: async (event) => {
    const { user, self } = await target(event);
    if (self) return fail(400, { action: 'delete', error: 'No puedes eliminar tu propia cuenta desde aquí.' });
    const deleted = await guardLastAdmin(user.id, user.role === 'admin', (tx) =>
      tx.delete(users).where(eq(users.id, user.id)),
    );
    if (!deleted) return fail(400, { action: 'delete', error: LAST_ADMIN });
    redirect(303, '/admin/usuarios');
  },
};
