import { sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['user', 'editor', 'admin']);
export const postCategoryEnum = pgEnum('post_category', ['news', 'update', 'blog']);
export const releaseChannelEnum = pgEnum('release_channel', ['stable', 'beta']);
export const sessionKindEnum = pgEnum('session_kind', ['web', 'launcher']);
export const loaderEnum = pgEnum('mod_loader', ['vanilla', 'fabric', 'forge', 'neoforge', 'quilt']);
export const instanceRoleEnum = pgEnum('instance_role', ['owner', 'manager', 'member']);
export const filePolicyEnum = pgEnum('file_policy', ['enforced', 'default']);

export type Role = (typeof roleEnum.enumValues)[number];
export type PostCategory = (typeof postCategoryEnum.enumValues)[number];
export type ReleaseChannel = (typeof releaseChannelEnum.enumValues)[number];
export type SessionKind = (typeof sessionKindEnum.enumValues)[number];
export type ModLoader = (typeof loaderEnum.enumValues)[number];
export type InstanceRole = (typeof instanceRoleEnum.enumValues)[number];
export type FilePolicy = (typeof filePolicyEnum.enumValues)[number];

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: varchar('username', { length: 16 }).notNull(),
    /** Always stored lower-cased. */
    email: varchar('email', { length: 254 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    role: roleEnum('role').notNull().default('user'),
    bannedAt: timestamp('banned_at', { withTimezone: true }),
    banReason: text('ban_reason'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('users_username_lower_idx').on(sql`lower(${t.username})`),
    uniqueIndex('users_email_idx').on(t.email),
  ],
);

/** Web cookies and launcher tokens. The id is the SHA-256 of the token; the token itself is never stored. */
export const sessions = pgTable(
  'sessions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: sessionKindEnum('kind').notNull(),
    label: text('label'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 120 }).notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    excerpt: varchar('excerpt', { length: 300 }).notNull().default(''),
    body: text('body').notNull().default(''),
    category: postCategoryEnum('category').notNull().default('news'),
    coverUrl: text('cover_url'),
    /** Null while it is a draft. */
    publishedAt: timestamp('published_at', { withTimezone: true }),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [uniqueIndex('posts_slug_idx').on(t.slug), index('posts_published_idx').on(t.publishedAt)],
);

export const releases = pgTable(
  'releases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    version: varchar('version', { length: 40 }).notNull(),
    channel: releaseChannelEnum('channel').notNull().default('stable'),
    notes: text('notes').notNull().default(''),
    downloadUrl: text('download_url').notNull(),
    fileName: text('file_name'),
    fileSize: bigint('file_size', { mode: 'number' }),
    sha256: varchar('sha256', { length: 64 }),
    githubUrl: text('github_url'),
    downloads: integer('downloads').notNull().default(0),
    /** Null while it is a draft. */
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('releases_version_idx').on(t.version)],
);

/** A private instance (event) whose game folder is managed from the website. */
export const privateInstances = pgTable('private_instances', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 60 }).notNull(),
  description: varchar('description', { length: 500 }).notNull().default(''),
  minecraftVersion: varchar('minecraft_version', { length: 32 }).notNull(),
  loader: loaderEnum('loader').notNull().default('fabric'),
  /** Null = latest stable loader for that Minecraft version. */
  loaderVersion: varchar('loader_version', { length: 64 }),
  /** host[:port] the launcher connects to directly. */
  serverAddress: varchar('server_address', { length: 255 }),
  /** Folders where the launcher removes any file that is not in the manifest. */
  lockedDirs: text('locked_dirs').array().notNull().default(sql`ARRAY['mods']::text[]`),
  /** Highest published version; 0 while nothing has been published. */
  currentVersion: integer('current_version').notNull().default(0),
  /** The draft changed since the last publish. */
  dirty: boolean('dirty').notNull().default(false),
  quotaBytes: bigint('quota_bytes', { mode: 'number' }).notNull().default(4 * 1024 * 1024 * 1024),
  /** SHA-256 of the Takumi Gate server key (the key itself is shown once). Null = no Gate server configured. */
  gateKeyHash: varchar('gate_key_hash', { length: 64 }).unique(),
  /** Last characters of the server key, so organizers can tell keys apart. */
  gateKeyHint: varchar('gate_key_hint', { length: 8 }),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  ...timestamps,
});

export const instanceMembers = pgTable(
  'instance_members',
  {
    instanceId: uuid('instance_id')
      .notNull()
      .references(() => privateInstances.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: instanceRoleEnum('role').notNull().default('member'),
    addedBy: uuid('added_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.instanceId, t.userId] }), index('instance_members_user_idx').on(t.userId)],
);

/** Invitation links. The id is the SHA-256 of the token; the token itself is never stored. */
export const instanceInvites = pgTable(
  'instance_invites',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    instanceId: uuid('instance_id')
      .notNull()
      .references(() => privateInstances.id, { onDelete: 'cascade' }),
    role: instanceRoleEnum('role').notNull().default('member'),
    /** Null = unlimited. */
    maxUses: integer('max_uses'),
    uses: integer('uses').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('instance_invites_instance_idx').on(t.instanceId)],
);

/** The draft: the game folder as it will be published next. File bodies live in blob storage by SHA-256. */
export const instanceFiles = pgTable(
  'instance_files',
  {
    instanceId: uuid('instance_id')
      .notNull()
      .references(() => privateInstances.id, { onDelete: 'cascade' }),
    path: varchar('path', { length: 512 }).notNull(),
    sha256: varchar('sha256', { length: 64 }).notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    policy: filePolicyEnum('policy').notNull().default('enforced'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.instanceId, t.path] })],
);

/** Published, signed manifests. Old ones are kept as history. */
export const instanceReleases = pgTable(
  'instance_releases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    instanceId: uuid('instance_id')
      .notNull()
      .references(() => privateInstances.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    /** Exact JSON text that was signed. */
    manifest: text('manifest').notNull(),
    /** Base64 Ed25519 signature of `manifest`. */
    signature: text('signature').notNull(),
    restartRequired: boolean('restart_required').notNull(),
    graceMinutes: integer('grace_minutes').notNull().default(5),
    notes: varchar('notes', { length: 500 }).notNull().default(''),
    publishedBy: uuid('published_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [uniqueIndex('instance_releases_version_idx').on(t.instanceId, t.version)],
);

/**
 * Join tickets: the launcher asks for one before starting a private instance and hands it to the game; the
 * Takumi Gate server mod checks it with /api/gate/verify. Bound to the Minecraft account, so a copied ticket
 * is useless on an online-mode server. The id is the SHA-256 of the ticket.
 */
export const instanceTickets = pgTable(
  'instance_tickets',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    instanceId: uuid('instance_id')
      .notNull()
      .references(() => privateInstances.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Minecraft profile id without dashes, lowercase. */
    mcUuid: varchar('mc_uuid', { length: 32 }).notNull(),
    mcName: varchar('mc_name', { length: 16 }).notNull(),
    /** Manifest version the launcher installed before launching. */
    version: integer('version').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('instance_tickets_expires_idx').on(t.expiresAt), index('instance_tickets_user_idx').on(t.instanceId, t.userId)],
);

export const instanceAudit = pgTable(
  'instance_audit',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    instanceId: uuid('instance_id')
      .notNull()
      .references(() => privateInstances.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 40 }).notNull(),
    detail: varchar('detail', { length: 600 }).notNull().default(''),
    ...timestamps,
  },
  (t) => [index('instance_audit_instance_idx').on(t.instanceId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Release = typeof releases.$inferSelect;
export type PrivateInstance = typeof privateInstances.$inferSelect;
export type InstanceFile = typeof instanceFiles.$inferSelect;
export type InstanceInvite = typeof instanceInvites.$inferSelect;
