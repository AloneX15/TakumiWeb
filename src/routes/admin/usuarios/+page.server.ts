import { and, desc, eq, ilike, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users, type Role } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/guards';
import type { PageServerLoad } from './$types';

const PER_PAGE = 25;
const ROLES: Role[] = ['user', 'editor', 'admin'];

export const load: PageServerLoad = async (event) => {
  requireUser(event, 'admin');
  const params = event.url.searchParams;
  const q = (params.get('q') ?? '').trim();
  const rawRole = params.get('rol');
  const role = ROLES.includes(rawRole as Role) ? (rawRole as Role) : null;
  const status = params.get('estado');
  const page = Math.max(1, Number(params.get('pagina')) || 1);

  const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
  const where = and(
    q ? or(ilike(users.username, pattern), ilike(users.email, pattern)) : undefined,
    role ? eq(users.role, role) : undefined,
    status === 'suspendidos' ? isNotNull(users.bannedAt) : status === 'activos' ? isNull(users.bannedAt) : undefined,
  );

  const [list, [{ total }]] = await Promise.all([
    db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        bannedAt: users.bannedAt,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.select({ total: sql<number>`count(*)::int` }).from(users).where(where),
  ]);

  return { users: list, total, q, role, status, page, pages: Math.max(1, Math.ceil(total / PER_PAGE)) };
};
