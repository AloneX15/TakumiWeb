import { and, asc, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import { LOADERS, LOCKABLE_DIRS, defaultPolicy, normalizePath } from '$lib/instance-paths';
import { findUserByLogin } from '../auth';
import { db } from '../db';
import {
  instanceAudit,
  instanceFiles,
  instanceInvites,
  instanceMembers,
  instanceReleases,
  instanceTickets,
  privateInstances,
  users,
  type FilePolicy,
  type InstanceRole,
  type ModLoader,
  type PrivateInstance,
} from '../db/schema';
import { INSTANCE_ROLE_RANK } from './access';
import { buildManifest, diffFiles, parseManifest, restartRequired, type ManifestFile } from './manifest';
import { signText } from './signing';

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

// ─── Audit ────────────────────────────────────────────────────────────────────

export async function audit(instanceId: string, userId: string | null, action: string, detail = '') {
  await db.insert(instanceAudit).values({ instanceId, userId, action, detail: detail.slice(0, 600) });
}

export async function recentAudit(instanceId: string, limit = 40) {
  return db
    .select({
      id: instanceAudit.id,
      action: instanceAudit.action,
      detail: instanceAudit.detail,
      createdAt: instanceAudit.createdAt,
      username: users.username,
    })
    .from(instanceAudit)
    .leftJoin(users, eq(users.id, instanceAudit.userId))
    .where(eq(instanceAudit.instanceId, instanceId))
    .orderBy(desc(instanceAudit.id))
    .limit(limit);
}

// ─── Instances ────────────────────────────────────────────────────────────────

export type InstanceSettingsInput = {
  name: string;
  description: string;
  minecraftVersion: string;
  loader: string;
  loaderVersion: string;
  serverAddress: string;
  lockedDirs: string[];
};

type CleanSettings = {
  name: string;
  description: string;
  minecraftVersion: string;
  loader: ModLoader;
  loaderVersion: string | null;
  serverAddress: string | null;
  lockedDirs: string[];
};

export function settingsFromForm(form: FormData): InstanceSettingsInput {
  const text = (key: string) => String(form.get(key) ?? '');
  return {
    name: text('name'),
    description: text('description'),
    minecraftVersion: text('minecraftVersion'),
    loader: text('loader'),
    loaderVersion: text('loaderVersion'),
    serverAddress: text('serverAddress'),
    lockedDirs: form.getAll('lockedDirs').map(String),
  };
}

export function checkSettings(input: InstanceSettingsInput): Result<{ value: CleanSettings }> {
  const name = input.name.trim();
  const description = input.description.trim();
  const minecraftVersion = input.minecraftVersion.trim();
  const loader = input.loader as ModLoader;
  const loaderVersion = input.loaderVersion.trim() || null;
  const serverAddress = input.serverAddress.trim() || null;
  const lockedDirs = [...new Set(input.lockedDirs)].filter((d) => (LOCKABLE_DIRS as readonly string[]).includes(d));

  if (name.length < 3 || name.length > 60) return { ok: false, error: 'El nombre debe tener entre 3 y 60 caracteres.' };
  if (description.length > 500) return { ok: false, error: 'La descripción no puede pasar de 500 caracteres.' };
  if (!/^[0-9A-Za-z][0-9A-Za-z._-]{0,31}$/.test(minecraftVersion)) {
    return { ok: false, error: 'Versión de Minecraft no válida (p. ej. 1.21.1).' };
  }
  if (!(LOADERS as readonly string[]).includes(loader)) return { ok: false, error: 'Loader no válido.' };
  if (loaderVersion && !/^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$/.test(loaderVersion)) {
    return { ok: false, error: 'Versión del loader no válida.' };
  }
  if (serverAddress && !/^[A-Za-z0-9]([A-Za-z0-9.-]{0,252})(:\d{1,5})?$/.test(serverAddress)) {
    return { ok: false, error: 'Dirección del servidor no válida (host o host:puerto).' };
  }
  return {
    ok: true,
    value: {
      name,
      description,
      minecraftVersion,
      loader,
      loaderVersion: loader === 'vanilla' ? null : loaderVersion,
      serverAddress,
      lockedDirs,
    },
  };
}

export async function createInstance(ownerId: string, input: InstanceSettingsInput): Promise<Result<{ id: string }>> {
  const checked = checkSettings(input);
  if (!checked.ok) return checked;
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(privateInstances)
      .values({ ...checked.value, ownerId })
      .returning({ id: privateInstances.id });
    await tx.insert(instanceMembers).values({ instanceId: row.id, userId: ownerId, role: 'owner', addedBy: ownerId });
    return row.id;
  });
  await audit(id, ownerId, 'create', checked.value.name);
  return { ok: true, id };
}

export async function updateInstance(instance: PrivateInstance, userId: string, input: InstanceSettingsInput): Promise<Result> {
  const checked = checkSettings(input);
  if (!checked.ok) return checked;
  await db
    .update(privateInstances)
    .set({ ...checked.value, dirty: true, updatedAt: new Date() })
    .where(eq(privateInstances.id, instance.id));
  await audit(instance.id, userId, 'settings', checked.value.name);
  return { ok: true };
}

export async function deleteInstance(instanceId: string) {
  // Members, invites, files, releases and audit rows cascade. Blobs stay in storage (shared by hash).
  await db.delete(privateInstances).where(eq(privateInstances.id, instanceId));
}

/** Instances the user is a member of, with their role. Admins also get every other instance (role null). */
export async function instancesForUser(user: { id: string; role: string }) {
  const own = await db
    .select({
      id: privateInstances.id,
      name: privateInstances.name,
      description: privateInstances.description,
      minecraftVersion: privateInstances.minecraftVersion,
      loader: privateInstances.loader,
      currentVersion: privateInstances.currentVersion,
      dirty: privateInstances.dirty,
      role: instanceMembers.role,
      members: sql<number>`(select count(*)::int from ${instanceMembers} m where m.instance_id = ${privateInstances.id})`,
    })
    .from(instanceMembers)
    .innerJoin(privateInstances, eq(privateInstances.id, instanceMembers.instanceId))
    .where(eq(instanceMembers.userId, user.id))
    .orderBy(asc(privateInstances.name));
  if (user.role !== 'admin') return { own, others: [] };
  const ids = own.map((i) => i.id);
  const others = await db
    .select({
      id: privateInstances.id,
      name: privateInstances.name,
      minecraftVersion: privateInstances.minecraftVersion,
      loader: privateInstances.loader,
      currentVersion: privateInstances.currentVersion,
      owner: users.username,
    })
    .from(privateInstances)
    .leftJoin(users, eq(users.id, privateInstances.ownerId))
    .orderBy(asc(privateInstances.name));
  return { own, others: others.filter((i) => !ids.includes(i.id)) };
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function listMembers(instanceId: string) {
  return db
    .select({
      userId: instanceMembers.userId,
      role: instanceMembers.role,
      createdAt: instanceMembers.createdAt,
      username: users.username,
      email: users.email,
      banned: sql<boolean>`${users.bannedAt} is not null`,
    })
    .from(instanceMembers)
    .innerJoin(users, eq(users.id, instanceMembers.userId))
    .where(eq(instanceMembers.instanceId, instanceId))
    .orderBy(desc(sql`case ${instanceMembers.role} when 'owner' then 2 when 'manager' then 1 else 0 end`), asc(users.username));
}

/** Only owners hand out or take away manager/owner roles; managers manage plain members. */
function mayAssign(actor: InstanceRole, role: InstanceRole) {
  return actor === 'owner' || INSTANCE_ROLE_RANK[role] < INSTANCE_ROLE_RANK.manager;
}

export async function addMember(instanceId: string, actor: { id: string; role: InstanceRole }, login: string, role: InstanceRole): Promise<Result> {
  if (!mayAssign(actor.role, role)) return { ok: false, error: 'Solo el propietario puede añadir gestores o propietarios.' };
  const user = login.trim() ? await findUserByLogin(login) : null;
  if (!user) return { ok: false, error: 'No existe ningún usuario con ese nombre o correo.' };
  if (user.bannedAt) return { ok: false, error: 'Esa cuenta está suspendida.' };
  const inserted = await db
    .insert(instanceMembers)
    .values({ instanceId, userId: user.id, role, addedBy: actor.id })
    .onConflictDoNothing()
    .returning({ userId: instanceMembers.userId });
  if (!inserted.length) return { ok: false, error: `${user.username} ya es miembro.` };
  await audit(instanceId, actor.id, 'member.add', `${user.username} (${role})`);
  return { ok: true };
}

/** Runs `change` unless it would leave the instance without an owner. */
async function keepAnOwner(instanceId: string, targetId: string, change: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<unknown>) {
  return db.transaction(async (tx) => {
    const owners = await tx
      .select({ userId: instanceMembers.userId })
      .from(instanceMembers)
      .where(and(eq(instanceMembers.instanceId, instanceId), eq(instanceMembers.role, 'owner')))
      .for('update');
    if (owners.length <= 1 && owners.some((o) => o.userId === targetId)) return false;
    await change(tx);
    return true;
  });
}

async function memberRole(instanceId: string, userId: string) {
  const [row] = await db
    .select({ role: instanceMembers.role, username: users.username })
    .from(instanceMembers)
    .innerJoin(users, eq(users.id, instanceMembers.userId))
    .where(and(eq(instanceMembers.instanceId, instanceId), eq(instanceMembers.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function changeMemberRole(instanceId: string, actor: { id: string; role: InstanceRole }, userId: string, role: InstanceRole): Promise<Result> {
  const target = await memberRole(instanceId, userId);
  if (!target) return { ok: false, error: 'Ese usuario no es miembro.' };
  if (!mayAssign(actor.role, role) || !mayAssign(actor.role, target.role)) {
    return { ok: false, error: 'Solo el propietario puede cambiar gestores o propietarios.' };
  }
  const done = await keepAnOwner(instanceId, userId, (tx) =>
    tx
      .update(instanceMembers)
      .set({ role })
      .where(and(eq(instanceMembers.instanceId, instanceId), eq(instanceMembers.userId, userId))),
  );
  if (!done) return { ok: false, error: 'La instancia debe tener al menos un propietario.' };
  await audit(instanceId, actor.id, 'member.role', `${target.username}: ${target.role} → ${role}`);
  return { ok: true };
}

export async function removeMember(instanceId: string, actor: { id: string; role: InstanceRole }, userId: string): Promise<Result> {
  const target = await memberRole(instanceId, userId);
  if (!target) return { ok: false, error: 'Ese usuario no es miembro.' };
  if (userId !== actor.id && !mayAssign(actor.role, target.role)) {
    return { ok: false, error: 'Solo el propietario puede expulsar a gestores o propietarios.' };
  }
  const done = await keepAnOwner(instanceId, userId, (tx) =>
    tx.delete(instanceMembers).where(and(eq(instanceMembers.instanceId, instanceId), eq(instanceMembers.userId, userId))),
  );
  if (!done) return { ok: false, error: 'La instancia debe tener al menos un propietario.' };
  // Their join tickets stop working at once, so the Gate server kicks them on the next join.
  await db.delete(instanceTickets).where(and(eq(instanceTickets.instanceId, instanceId), eq(instanceTickets.userId, userId)));
  await audit(instanceId, actor.id, userId === actor.id ? 'member.leave' : 'member.remove', target.username);
  return { ok: true };
}

// ─── Invites ──────────────────────────────────────────────────────────────────

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export type InviteInput = { role: InstanceRole; maxUses: number | null; expiresInDays: number | null };

export async function createInvite(instanceId: string, actor: { id: string; role: InstanceRole }, input: InviteInput): Promise<Result<{ token: string }>> {
  if (input.role === 'owner') return { ok: false, error: 'Las invitaciones no pueden dar el rol de propietario.' };
  if (!mayAssign(actor.role, input.role)) return { ok: false, error: 'Solo el propietario puede invitar gestores.' };
  if (input.maxUses !== null && (!Number.isInteger(input.maxUses) || input.maxUses < 1 || input.maxUses > 10000)) {
    return { ok: false, error: 'Número de usos no válido (1–10000 o ilimitado).' };
  }
  if (input.expiresInDays !== null && (!Number.isInteger(input.expiresInDays) || input.expiresInDays < 1 || input.expiresInDays > 365)) {
    return { ok: false, error: 'Caducidad no válida (1–365 días o nunca).' };
  }
  const token = randomBytes(24).toString('base64url');
  const expiresAt = input.expiresInDays ? new Date(Date.now() + input.expiresInDays * 86_400_000) : null;
  await db.insert(instanceInvites).values({
    id: hashToken(token),
    instanceId,
    role: input.role,
    maxUses: input.maxUses,
    expiresAt,
    createdBy: actor.id,
  });
  await audit(instanceId, actor.id, 'invite.create', `${input.role}, usos: ${input.maxUses ?? '∞'}, días: ${input.expiresInDays ?? '∞'}`);
  return { ok: true, token };
}

export async function listInvites(instanceId: string) {
  const rows = await db
    .select({
      id: instanceInvites.id,
      role: instanceInvites.role,
      maxUses: instanceInvites.maxUses,
      uses: instanceInvites.uses,
      expiresAt: instanceInvites.expiresAt,
      revokedAt: instanceInvites.revokedAt,
      createdAt: instanceInvites.createdAt,
      createdBy: users.username,
    })
    .from(instanceInvites)
    .leftJoin(users, eq(users.id, instanceInvites.createdBy))
    .where(eq(instanceInvites.instanceId, instanceId))
    .orderBy(desc(instanceInvites.createdAt));
  return rows.map((row) => ({ ...row, active: inviteProblem(row) === null }));
}

export async function revokeInvite(instanceId: string, userId: string, inviteId: string) {
  const updated = await db
    .update(instanceInvites)
    .set({ revokedAt: new Date() })
    .where(and(eq(instanceInvites.id, inviteId), eq(instanceInvites.instanceId, instanceId)))
    .returning({ id: instanceInvites.id });
  if (updated.length) await audit(instanceId, userId, 'invite.revoke');
}

/** Why an invite cannot be used, or null when it can. */
export function inviteProblem(invite: { revokedAt: Date | null; expiresAt: Date | null; maxUses: number | null; uses: number }) {
  if (invite.revokedAt) return 'Esta invitación ha sido revocada.';
  if (invite.expiresAt && invite.expiresAt.getTime() <= Date.now()) return 'Esta invitación ha caducado.';
  if (invite.maxUses !== null && invite.uses >= invite.maxUses) return 'Esta invitación ya se ha usado el máximo de veces.';
  return null;
}

/** Looks up an invite link for the confirmation page. */
export async function findInvite(token: string) {
  if (!token || token.length > 100) return null;
  const [row] = await db
    .select({ invite: instanceInvites, instance: privateInstances, owner: users.username })
    .from(instanceInvites)
    .innerJoin(privateInstances, eq(privateInstances.id, instanceInvites.instanceId))
    .leftJoin(users, eq(users.id, privateInstances.ownerId))
    .where(eq(instanceInvites.id, hashToken(token)))
    .limit(1);
  return row ?? null;
}

/**
 * Accepts an invite: adds the user as a member and counts the use. The invite row is locked so a
 * limited invite cannot be used more times than allowed by parallel requests. Existing members keep
 * their role (an invite never downgrades anyone).
 */
export async function acceptInvite(token: string, user: { id: string; username: string }): Promise<Result<{ instanceId: string; already: boolean }>> {
  if (!token || token.length > 100) return { ok: false, error: 'Invitación no válida.' };
  const outcome = await db.transaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(instanceInvites)
      .where(eq(instanceInvites.id, hashToken(token)))
      .for('update')
      .limit(1);
    if (!invite) return { ok: false as const, error: 'Invitación no válida.' };
    const [existing] = await tx
      .select({ role: instanceMembers.role })
      .from(instanceMembers)
      .where(and(eq(instanceMembers.instanceId, invite.instanceId), eq(instanceMembers.userId, user.id)))
      .limit(1);
    if (existing) return { ok: true as const, instanceId: invite.instanceId, already: true };
    const problem = inviteProblem(invite);
    if (problem) return { ok: false as const, error: problem };
    await tx.insert(instanceMembers).values({
      instanceId: invite.instanceId,
      userId: user.id,
      role: invite.role,
      addedBy: invite.createdBy,
    });
    await tx.update(instanceInvites).set({ uses: invite.uses + 1 }).where(eq(instanceInvites.id, invite.id));
    return { ok: true as const, instanceId: invite.instanceId, already: false };
  });
  if (outcome.ok && !outcome.already) await audit(outcome.instanceId, user.id, 'member.join', `${user.username} (enlace)`);
  return outcome;
}

// ─── Draft files ──────────────────────────────────────────────────────────────

export const MAX_FILE_BYTES = 512 * 1024 * 1024;

export async function listFiles(instanceId: string) {
  return db
    .select({
      path: instanceFiles.path,
      sha256: instanceFiles.sha256,
      size: instanceFiles.size,
      policy: instanceFiles.policy,
      updatedAt: instanceFiles.updatedAt,
    })
    .from(instanceFiles)
    .where(eq(instanceFiles.instanceId, instanceId))
    .orderBy(asc(instanceFiles.path));
}

export async function getFile(instanceId: string, path: string) {
  const [row] = await db
    .select()
    .from(instanceFiles)
    .where(and(eq(instanceFiles.instanceId, instanceId), eq(instanceFiles.path, path)))
    .limit(1);
  return row ?? null;
}

/** Bytes used by the draft, not counting `exceptPath` (a file about to be replaced). */
export async function usedBytes(instanceId: string, exceptPath?: string) {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${instanceFiles.size}), 0)` })
    .from(instanceFiles)
    .where(
      exceptPath
        ? and(eq(instanceFiles.instanceId, instanceId), sql`${instanceFiles.path} <> ${exceptPath}`)
        : eq(instanceFiles.instanceId, instanceId),
    );
  return Number(row.total);
}

async function markDirty(instanceId: string) {
  await db.update(privateInstances).set({ dirty: true, updatedAt: new Date() }).where(eq(privateInstances.id, instanceId));
}

/** A file path must not collide with a folder ("mods" as a file while "mods/a.jar" exists) or vice versa. */
async function collides(instanceId: string, path: string) {
  const parents: string[] = [];
  for (let i = path.indexOf('/'); i !== -1; i = path.indexOf('/', i + 1)) parents.push(path.slice(0, i));
  const [row] = await db
    .select({ path: instanceFiles.path })
    .from(instanceFiles)
    .where(
      and(
        eq(instanceFiles.instanceId, instanceId),
        or(like(instanceFiles.path, `${escapeLike(path)}/%`), parents.length ? inArray(instanceFiles.path, parents) : undefined),
      ),
    )
    .limit(1);
  return row ? `«${path}» choca con «${row.path}» (un archivo y una carpeta no pueden llamarse igual).` : null;
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function putFile(instanceId: string, userId: string, path: string, blob: { sha256: string; size: number }): Promise<Result> {
  const clash = await collides(instanceId, path);
  if (clash) return { ok: false, error: clash };
  const existing = await getFile(instanceId, path);
  if (existing?.sha256 === blob.sha256) return { ok: true };
  await db
    .insert(instanceFiles)
    .values({ instanceId, path, sha256: blob.sha256, size: blob.size, policy: existing?.policy ?? defaultPolicy(path) })
    .onConflictDoUpdate({
      target: [instanceFiles.instanceId, instanceFiles.path],
      set: { sha256: blob.sha256, size: blob.size, updatedAt: new Date() },
    });
  await markDirty(instanceId);
  await audit(instanceId, userId, existing ? 'file.update' : 'file.add', path);
  return { ok: true };
}

/** Deletes a file, or a whole folder when `path` names one. */
export async function deletePath(instanceId: string, userId: string, rawPath: string): Promise<Result<{ count: number }>> {
  const path = normalizePath(rawPath);
  if (!path) return { ok: false, error: 'Ruta no válida.' };
  const removed = await db
    .delete(instanceFiles)
    .where(and(eq(instanceFiles.instanceId, instanceId), or(eq(instanceFiles.path, path), like(instanceFiles.path, `${escapeLike(path)}/%`))))
    .returning({ path: instanceFiles.path });
  if (!removed.length) return { ok: false, error: 'No existe.' };
  await markDirty(instanceId);
  await audit(instanceId, userId, 'file.delete', removed.length > 1 ? `${path}/ (${removed.length} archivos)` : path);
  return { ok: true, count: removed.length };
}

/** Renames or moves a file or folder. */
export async function movePath(instanceId: string, userId: string, rawFrom: string, rawTo: string): Promise<Result> {
  const from = normalizePath(rawFrom);
  const to = normalizePath(rawTo);
  if (!from || !to) return { ok: false, error: 'Ruta no válida.' };
  if (from === to) return { ok: true };
  if (to.startsWith(`${from}/`)) return { ok: false, error: 'No se puede mover una carpeta dentro de sí misma.' };
  const files = await listFiles(instanceId);
  const moving = files.filter((f) => f.path === from || f.path.startsWith(`${from}/`));
  if (!moving.length) return { ok: false, error: 'No existe.' };
  const renamed = moving.map((f) => ({ ...f, newPath: to + f.path.slice(from.length) }));
  const staying = new Set(files.filter((f) => !moving.includes(f)).map((f) => f.path));
  for (const f of renamed) {
    if (!normalizePath(f.newPath)) return { ok: false, error: `Ruta resultante no válida: ${f.newPath}` };
    if (staying.has(f.newPath)) return { ok: false, error: `Ya existe «${f.newPath}».` };
    for (const other of staying) {
      if (other.startsWith(`${f.newPath}/`) || f.newPath.startsWith(`${other}/`)) {
        return { ok: false, error: `«${f.newPath}» choca con «${other}».` };
      }
    }
  }
  await db.transaction(async (tx) => {
    for (const f of renamed) {
      await tx
        .update(instanceFiles)
        .set({ path: f.newPath, updatedAt: new Date() })
        .where(and(eq(instanceFiles.instanceId, instanceId), eq(instanceFiles.path, f.path)));
    }
  });
  await markDirty(instanceId);
  await audit(instanceId, userId, 'file.move', `${from} → ${to}`);
  return { ok: true };
}

export async function setPolicy(instanceId: string, userId: string, rawPath: string, policy: FilePolicy): Promise<Result> {
  const path = normalizePath(rawPath);
  if (!path || !['enforced', 'default'].includes(policy)) return { ok: false, error: 'Datos no válidos.' };
  const updated = await db
    .update(instanceFiles)
    .set({ policy })
    .where(and(eq(instanceFiles.instanceId, instanceId), eq(instanceFiles.path, path)))
    .returning({ path: instanceFiles.path });
  if (!updated.length) return { ok: false, error: 'No existe.' };
  await markDirty(instanceId);
  await audit(instanceId, userId, 'file.policy', `${path}: ${policy}`);
  return { ok: true };
}

// ─── Publishing ───────────────────────────────────────────────────────────────

export async function latestRelease(instanceId: string) {
  const [row] = await db
    .select()
    .from(instanceReleases)
    .where(eq(instanceReleases.instanceId, instanceId))
    .orderBy(desc(instanceReleases.version))
    .limit(1);
  return row ?? null;
}

export async function listReleases(instanceId: string) {
  return db
    .select({
      version: instanceReleases.version,
      restartRequired: instanceReleases.restartRequired,
      graceMinutes: instanceReleases.graceMinutes,
      notes: instanceReleases.notes,
      createdAt: instanceReleases.createdAt,
      publishedBy: users.username,
    })
    .from(instanceReleases)
    .leftJoin(users, eq(users.id, instanceReleases.publishedBy))
    .where(eq(instanceReleases.instanceId, instanceId))
    .orderBy(desc(instanceReleases.version))
    .limit(50);
}

function settingsOf(instance: PrivateInstance) {
  return {
    minecraft: instance.minecraftVersion,
    loader: instance.loader,
    loader_version: instance.loaderVersion,
    locked_dirs: instance.lockedDirs,
  };
}

/** What publishing now would change compared with the last published version. */
export async function pendingChanges(instance: PrivateInstance) {
  const [files, previous] = await Promise.all([listFiles(instance.id), latestRelease(instance.id)]);
  const before = previous ? parseManifest(previous.manifest) : null;
  const diff = diffFiles(before?.files ?? [], files as ManifestFile[]);
  return {
    diff,
    restartRequired: restartRequired(diff, before, settingsOf(instance)),
    settingsChanged: !!before && (before.name !== instance.name || before.server !== instance.serverAddress),
  };
}

export type PublishInput = { graceMinutes: number; notes: string; forceRestart: boolean };

export async function publish(instanceId: string, userId: string, input: PublishInput): Promise<Result<{ version: number }>> {
  if (!Number.isInteger(input.graceMinutes) || input.graceMinutes < 0 || input.graceMinutes > 120) {
    return { ok: false, error: 'El período de gracia debe estar entre 0 y 120 minutos.' };
  }
  const outcome = await db.transaction(async (tx) => {
    const [instance] = await tx.select().from(privateInstances).where(eq(privateInstances.id, instanceId)).for('update');
    if (!instance) return { ok: false as const, error: 'La instancia ya no existe.' };
    const files = await tx
      .select({ path: instanceFiles.path, sha256: instanceFiles.sha256, size: instanceFiles.size, policy: instanceFiles.policy })
      .from(instanceFiles)
      .where(eq(instanceFiles.instanceId, instanceId));
    const [previous] = await tx
      .select({ manifest: instanceReleases.manifest })
      .from(instanceReleases)
      .where(eq(instanceReleases.instanceId, instanceId))
      .orderBy(desc(instanceReleases.version))
      .limit(1);
    const before = previous ? parseManifest(previous.manifest) : null;
    const diff = diffFiles(before?.files ?? [], files);
    const restart = input.forceRestart || restartRequired(diff, before, settingsOf(instance));
    const version = instance.currentVersion + 1;
    const manifest = buildManifest({
      instance: instance.id,
      name: instance.name,
      version,
      minecraft: instance.minecraftVersion,
      loader: instance.loader,
      loader_version: instance.loaderVersion,
      server: instance.serverAddress,
      locked_dirs: instance.lockedDirs,
      restart_required: restart,
      grace_minutes: input.graceMinutes,
      published_at: new Date().toISOString(),
      files,
    });
    await tx.insert(instanceReleases).values({
      instanceId,
      version,
      manifest,
      signature: signText(manifest),
      restartRequired: restart,
      graceMinutes: input.graceMinutes,
      notes: input.notes.trim().slice(0, 500),
      publishedBy: userId,
    });
    await tx
      .update(privateInstances)
      .set({ currentVersion: version, dirty: false, updatedAt: new Date() })
      .where(eq(privateInstances.id, instanceId));
    const summary = `+${diff.added.length} ~${diff.changed.length} -${diff.removed.length}${restart ? ', requiere reinicio' : ''}`;
    return { ok: true as const, version, summary };
  });
  if (outcome.ok) await audit(instanceId, userId, 'publish', `v${outcome.version} (${outcome.summary})`);
  return outcome;
}

// ─── Launcher API ─────────────────────────────────────────────────────────────

/** Private instances a launcher user may play: the ones they are a member of, published or not. */
export async function launcherInstances(userId: string) {
  return db
    .select({
      id: privateInstances.id,
      name: privateInstances.name,
      description: privateInstances.description,
      minecraft: privateInstances.minecraftVersion,
      loader: privateInstances.loader,
      loader_version: privateInstances.loaderVersion,
      server: privateInstances.serverAddress,
      version: privateInstances.currentVersion,
      role: instanceMembers.role,
    })
    .from(instanceMembers)
    .innerJoin(privateInstances, eq(privateInstances.id, instanceMembers.instanceId))
    .where(eq(instanceMembers.userId, userId))
    .orderBy(asc(privateInstances.name));
}

export async function isMember(instanceId: string, userId: string) {
  const [row] = await db
    .select({ role: instanceMembers.role })
    .from(instanceMembers)
    .where(and(eq(instanceMembers.instanceId, instanceId), eq(instanceMembers.userId, userId)))
    .limit(1);
  return !!row;
}

/** sha256 values in each release, cached by release id (releases never change once written). */
const releaseHashes = new Map<string, Set<string>>();

export function hashesOf(release: { id: string; manifest: string }) {
  let set = releaseHashes.get(release.id);
  if (!set) {
    set = new Set(parseManifest(release.manifest).files.map((f) => f.sha256));
    if (releaseHashes.size > 500) releaseHashes.clear();
    releaseHashes.set(release.id, set);
  }
  return set;
}
