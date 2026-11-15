import { and, desc, eq, gt, isNull, lt } from 'drizzle-orm';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { db } from '../db';
import { instanceMembers, instanceReleases, instanceTickets, privateInstances, users } from '../db/schema';
import { audit } from './service';
import { signingSecret } from './signing';

/**
 * Phases 2–4 of private instances:
 * - Takumi Gate: a server key per instance and join tickets the server mod verifies.
 * - Live updates: a light status endpoint the launcher and the server poll.
 * - Vault: the per-member key the launcher encrypts event files with on disk.
 */

const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

/** Tickets are bound to the Minecraft account, so they can be reused for reconnects until they expire. */
export const TICKET_HOURS = 12;
const TICKET_PREFIX = 'tkt_';
const GATE_KEY_PREFIX = 'tgk_';

export const MC_NAME = /^[A-Za-z0-9_]{1,16}$/;

/** Minecraft profile id → 32 lowercase hex characters, or null. */
export function normalizeUuid(raw: unknown) {
  if (typeof raw !== 'string') return null;
  const hex = raw.trim().toLowerCase().replaceAll('-', '');
  return /^[0-9a-f]{32}$/.test(hex) ? hex : null;
}

// ─── Server key ───────────────────────────────────────────────────────────────

/** Creates (or replaces) the Gate server key. Returns the key; only its hash is stored. */
export async function createGateKey(instanceId: string, userId: string) {
  const key = GATE_KEY_PREFIX + randomBytes(32).toString('base64url');
  await db
    .update(privateInstances)
    .set({ gateKeyHash: sha256(key), gateKeyHint: key.slice(-6), updatedAt: new Date() })
    .where(eq(privateInstances.id, instanceId));
  await audit(instanceId, userId, 'gate_key', 'Nueva clave de servidor');
  return key;
}

export async function revokeGateKey(instanceId: string, userId: string) {
  await db
    .update(privateInstances)
    .set({ gateKeyHash: null, gateKeyHint: null, updatedAt: new Date() })
    .where(eq(privateInstances.id, instanceId));
  await audit(instanceId, userId, 'gate_key_revoke', 'Clave de servidor revocada');
}

/** Instance a Gate server key belongs to, or null. */
export async function instanceByGateKey(key: string | null) {
  if (!key || !key.startsWith(GATE_KEY_PREFIX) || key.length > 100) return null;
  const [row] = await db
    .select()
    .from(privateInstances)
    .where(eq(privateInstances.gateKeyHash, sha256(key)))
    .limit(1);
  return row ?? null;
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export type TicketInput = { uuid: string; name: string; version: number };

export async function issueTicket(instanceId: string, userId: string, input: TicketInput) {
  const ticket = TICKET_PREFIX + randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + TICKET_HOURS * 3600_000);
  await db.insert(instanceTickets).values({
    id: sha256(ticket),
    instanceId,
    userId,
    mcUuid: input.uuid,
    mcName: input.name,
    version: input.version,
    expiresAt,
  });
  return { ticket, expiresAt };
}

export type VerifyResult =
  | {
      ok: true;
      username: string;
      version: number;
      currentVersion: number;
      /** A release newer than the ticket's version needs a restart. */
      restartRequired: boolean;
    }
  | { ok: false; error: string };

/**
 * Who is joining, as the Gate server knows it: the profile id on online-mode servers, or only the name on
 * offline-mode servers (there the id is derived from the name, and Takumi offline accounts use random ids).
 */
export type Joiner = { uuid: string } | { name: string };

/** Checks a ticket presented to the Gate server of `instanceId` by `joiner`. */
export async function verifyTicket(instanceId: string, ticket: string, joiner: Joiner): Promise<VerifyResult> {
  const denied = (error: string): VerifyResult => ({ ok: false, error });
  if (!ticket.startsWith(TICKET_PREFIX) || ticket.length > 100) return denied('Ticket no válido.');
  const [row] = await db
    .select({
      instanceId: instanceTickets.instanceId,
      userId: instanceTickets.userId,
      mcUuid: instanceTickets.mcUuid,
      mcName: instanceTickets.mcName,
      version: instanceTickets.version,
      expiresAt: instanceTickets.expiresAt,
      username: users.username,
      bannedAt: users.bannedAt,
    })
    .from(instanceTickets)
    .innerJoin(users, eq(users.id, instanceTickets.userId))
    .where(eq(instanceTickets.id, sha256(ticket)))
    .limit(1);
  if (!row || row.instanceId !== instanceId) return denied('Ticket no válido para este servidor.');
  if (row.expiresAt.getTime() < Date.now()) return denied('El ticket ha caducado. Vuelve a lanzar desde Takumi Launcher.');
  const sameAccount =
    'uuid' in joiner ? row.mcUuid === joiner.uuid : row.mcName.toLowerCase() === joiner.name.toLowerCase();
  if (!sameAccount) return denied('Este ticket pertenece a otra cuenta de Minecraft.');
  if (row.bannedAt) return denied('Tu cuenta de Takumi está suspendida.');
  const [member] = await db
    .select({ role: instanceMembers.role })
    .from(instanceMembers)
    .where(and(eq(instanceMembers.instanceId, instanceId), eq(instanceMembers.userId, row.userId)))
    .limit(1);
  if (!member) return denied('Ya no eres miembro de esta instancia.');
  const status = await releaseStatus(instanceId, row.version);
  await db.update(instanceTickets).set({ lastUsedAt: new Date() }).where(eq(instanceTickets.id, sha256(ticket)));
  return {
    ok: true,
    username: row.username,
    version: row.version,
    currentVersion: status.version,
    restartRequired: status.restartRequired,
  };
}

export async function purgeExpiredTickets() {
  await db.delete(instanceTickets).where(lt(instanceTickets.expiresAt, new Date()));
}

/** Expelled members lose their tickets at once. */
export async function revokeTickets(instanceId: string, userId: string) {
  await db
    .delete(instanceTickets)
    .where(and(eq(instanceTickets.instanceId, instanceId), eq(instanceTickets.userId, userId)));
}

// ─── Release status ───────────────────────────────────────────────────────────

export type ReleaseStatus = {
  version: number;
  /** Some release after `since` changed code or config: the game must restart. */
  restartRequired: boolean;
  graceMinutes: number;
  notes: string;
  publishedAt: string | null;
};

/** Latest published version and whether going from `since` to it needs a restart. */
export async function releaseStatus(instanceId: string, since: number): Promise<ReleaseStatus> {
  const [latest] = await db
    .select()
    .from(instanceReleases)
    .where(eq(instanceReleases.instanceId, instanceId))
    .orderBy(desc(instanceReleases.version))
    .limit(1);
  if (!latest) return { version: 0, restartRequired: false, graceMinutes: 0, notes: '', publishedAt: null };
  let restartRequired = false;
  if (latest.version > since) {
    const [needs] = await db
      .select({ version: instanceReleases.version })
      .from(instanceReleases)
      .where(
        and(
          eq(instanceReleases.instanceId, instanceId),
          gt(instanceReleases.version, since),
          eq(instanceReleases.restartRequired, true),
        ),
      )
      .limit(1);
    restartRequired = !!needs;
  }
  return {
    version: latest.version,
    restartRequired,
    graceMinutes: latest.graceMinutes,
    notes: latest.notes,
    publishedAt: latest.createdAt.toISOString(),
  };
}

/** Recent releases for the Gate server, newest first. */
export async function recentReleases(instanceId: string, limit = 20) {
  const rows = await db
    .select({
      version: instanceReleases.version,
      restartRequired: instanceReleases.restartRequired,
      graceMinutes: instanceReleases.graceMinutes,
      notes: instanceReleases.notes,
      createdAt: instanceReleases.createdAt,
    })
    .from(instanceReleases)
    .where(eq(instanceReleases.instanceId, instanceId))
    .orderBy(desc(instanceReleases.version))
    .limit(limit);
  return rows.map((r) => ({
    version: r.version,
    restart_required: r.restartRequired,
    grace_minutes: r.graceMinutes,
    notes: r.notes,
    published_at: r.createdAt.toISOString(),
  }));
}

// ─── Vault key ────────────────────────────────────────────────────────────────

/**
 * Key the launcher encrypts this member's copy of the event files with (AES-256-GCM). It is derived, not
 * stored: HMAC-SHA256(server secret, instance, user). The launcher keeps it only in memory, so the files on
 * disk are useless without signing in, and an expelled member can no longer open them.
 * `id` changes when the server secret changes; the launcher then downloads the files again.
 */
export function vaultKey(instanceId: string, userId: string) {
  const secret = signingSecret();
  const key = createHmac('sha256', secret).update(`takumi-vault:v1:${instanceId}:${userId}`).digest();
  const id = createHmac('sha256', secret).update('takumi-vault:v1:id').digest('hex').slice(0, 16);
  return { id, key: key.toString('base64') };
}

/** Members of an instance that is still active (used to reject stale vault-key requests). */
export async function activeMember(instanceId: string, userId: string) {
  const [row] = await db
    .select({ role: instanceMembers.role })
    .from(instanceMembers)
    .innerJoin(users, eq(users.id, instanceMembers.userId))
    .where(and(eq(instanceMembers.instanceId, instanceId), eq(instanceMembers.userId, userId), isNull(users.bannedAt)))
    .limit(1);
  return !!row;
}
