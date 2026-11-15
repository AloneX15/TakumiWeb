import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { checkEmail, checkPassword, checkUsername, normalizeEmail } from '$lib/validation';
import { hashPassword, purgeExpiredSessions } from './auth';
import { db, runMigrations } from './db';
import { users } from './db/schema';

/** Apply pending migrations and create the first administrator from the environment. */
export async function bootstrap() {
  await runMigrations();
  await seedAdmin();
  await purgeExpiredSessions();
  setInterval(() => purgeExpiredSessions().catch(console.error), 6 * 60 * 60 * 1000).unref();
}

async function seedAdmin() {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin')).limit(1);
  if (existing) return;

  const username = env.ADMIN_USERNAME?.trim() || 'admin';
  const email = normalizeEmail(env.ADMIN_EMAIL || 'admin@takumilabs.org');
  const password = env.ADMIN_PASSWORD ?? '';
  const problem = checkUsername(username) ?? checkEmail(email) ?? checkPassword(password);
  if (problem) {
    console.warn(`[takumi] No hay ningún administrador. Define ADMIN_USERNAME, ADMIN_EMAIL y ADMIN_PASSWORD (${problem})`);
    return;
  }
  await db.insert(users).values({ username, email, passwordHash: await hashPassword(password), role: 'admin' });
  console.info(`[takumi] Administrador "${username}" creado.`);
}
