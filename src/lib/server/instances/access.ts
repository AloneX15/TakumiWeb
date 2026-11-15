import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { PublicUser } from '../auth';
import { hasRole } from '../auth';
import { db } from '../db';
import { instanceMembers, privateInstances, type InstanceRole, type PrivateInstance } from '../db/schema';
import { requireUser } from '../guards';

/**
 * Two levels of roles:
 * - Site role (users.role): `editor` and `admin` can create private instances. An `admin` can open and
 *   manage every instance (moderation) without being a member.
 * - Instance role (instance_members.role): owner > manager > member.
 *     owner   – everything, including deleting the instance and managing managers
 *     manager – files, members, invites and publishing
 *     member  – download and play
 */

export const INSTANCE_ROLE_RANK: Record<InstanceRole, number> = { member: 0, manager: 1, owner: 2 };
export const INSTANCE_ROLE_LABELS: Record<InstanceRole, string> = {
  owner: 'Propietario',
  manager: 'Gestor',
  member: 'Miembro',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function canCreateInstances(user: Pick<PublicUser, 'role'> | null | undefined) {
  return hasRole(user, 'editor');
}

export function atLeast(role: InstanceRole | null, wanted: InstanceRole) {
  return role !== null && INSTANCE_ROLE_RANK[role] >= INSTANCE_ROLE_RANK[wanted];
}

export type InstanceAccess = {
  instance: PrivateInstance;
  /** Effective role: a site admin who is not a member acts as owner. */
  role: InstanceRole;
  /** The user's own membership role, null for an admin who is not a member. */
  memberRole: InstanceRole | null;
};

/** The instance and the user's effective role, or null when it does not exist or the user has no access. */
export async function instanceAccess(user: Pick<PublicUser, 'id' | 'role'>, instanceId: string): Promise<InstanceAccess | null> {
  if (!UUID.test(instanceId)) return null;
  const [row] = await db
    .select({ instance: privateInstances, memberRole: instanceMembers.role })
    .from(privateInstances)
    .leftJoin(
      instanceMembers,
      and(eq(instanceMembers.instanceId, privateInstances.id), eq(instanceMembers.userId, user.id)),
    )
    .where(eq(privateInstances.id, instanceId))
    .limit(1);
  if (!row) return null;
  const memberRole = row.memberRole ?? null;
  if (memberRole) return { instance: row.instance, role: memberRole, memberRole };
  if (hasRole(user, 'admin')) return { instance: row.instance, role: 'owner', memberRole: null };
  return null;
}

/**
 * Page/action/endpoint guard for `/instancias/[id]/…`. Signed-out users go to the login page; users without
 * access get a 404 so instance ids cannot be probed; members below `wanted` get a 403.
 */
export async function requireInstance(
  event: Pick<RequestEvent, 'locals' | 'url' | 'params'>,
  wanted: InstanceRole = 'member',
): Promise<InstanceAccess & { user: PublicUser }> {
  const user = requireUser(event);
  const access = await instanceAccess(user, (event.params as { id?: string }).id ?? '');
  if (!access) error(404, 'Esta instancia no existe o no tienes acceso.');
  if (!atLeast(access.role, wanted)) error(403, 'Tu rol en esta instancia no permite hacer esto.');
  return { ...access, user };
}
