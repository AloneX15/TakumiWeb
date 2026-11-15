import { env } from '$env/dynamic/private';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { migrate as migratePostgres } from 'drizzle-orm/postgres-js/migrator';
import { mkdirSync } from 'node:fs';
import postgres from 'postgres';
import * as schema from './schema';

const MIGRATIONS = 'drizzle';

function connect() {
  const url = env.DATABASE_URL?.trim();
  if (url) {
    const client = postgres(url, { max: Number(env.DATABASE_POOL_SIZE) || 10 });
    const db = drizzlePostgres(client, { schema });
    return { db, migrate: () => migratePostgres(db, { migrationsFolder: MIGRATIONS }) };
  }
  // Embedded Postgres for local development: no server needed.
  const dir = env.PGLITE_DIR || './data/pglite';
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzlePglite(client, { schema });
  return { db, migrate: () => migratePglite(db, { migrationsFolder: MIGRATIONS }) };
}

type Connection = ReturnType<typeof connect>;

// Vite reloads server modules in development; keep one connection per process.
const holder = globalThis as unknown as { __takumiDb?: Connection };
const connection = (holder.__takumiDb ??= connect());

/** Typed query builder shared by both drivers (same schema, same SQL dialect). */
export const db = connection.db as unknown as ReturnType<typeof drizzlePostgres<typeof schema>>;

export const runMigrations = connection.migrate;
export { schema };
