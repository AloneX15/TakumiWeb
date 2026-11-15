import { sql } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  pgEnum,
  pgTable,
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

export type Role = (typeof roleEnum.enumValues)[number];
export type PostCategory = (typeof postCategoryEnum.enumValues)[number];
export type ReleaseChannel = (typeof releaseChannelEnum.enumValues)[number];
export type SessionKind = (typeof sessionKindEnum.enumValues)[number];

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

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Release = typeof releases.$inferSelect;
