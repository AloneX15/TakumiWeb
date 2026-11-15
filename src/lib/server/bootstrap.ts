import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { checkEmail, checkPassword, checkUsername } from '$lib/validation';
import { hashPassword, purgeExpiredSessions } from './auth';
import { db, runMigrations } from './db';
import { users } from './db/schema';
import { findConflict, firstAdminIdentity } from './users';

/** Apply pending migrations and create the first administrator from the environment. */
export async function bootstrap() {
  checkOrigin();
  await runMigrations();
  await seedAdmin();
  await purgeExpiredSessions();
  setInterval(() => purgeExpiredSessions().catch(console.error), 6 * 60 * 60 * 1000).unref();
}

/**
 * Production servers must know their public URL: SvelteKit uses it for the form CSRF check and for
 * the absolute links in the API, and without it they would come from the request's Host header.
 */
function checkOrigin() {
  if (dev) return;
  const origin = env.ORIGIN?.trim();
  if (!origin) throw new Error('[takumi] Define ORIGIN con la URL pública del sitio, p. ej. https://takumilabs.org');
  const url = new URL(origin);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !local) {
    throw new Error(`[takumi] ORIGIN debe usar https (${origin}). Sin https las cookies de sesión no son seguras.`);
  }
}

async function seedAdmin() {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin')).limit(1);
  if (existing) return;

  const { username, email } = firstAdminIdentity();
  const password = env.ADMIN_PASSWORD ?? '';
  const problem = checkUsername(username) ?? checkEmail(email) ?? checkPassword(password);
  if (problem) {
    console.warn(`[takumi] No hay ningún administrador. Define ADMIN_USERNAME, ADMIN_EMAIL y ADMIN_PASSWORD (${problem})`);
    return;
  }
  const conflict = await findConflict(username, email);
  if (conflict) {
    console.error(
      `[takumi] No se ha creado el administrador "${username}": ${conflict} ` +
        'Cambia ADMIN_USERNAME / ADMIN_EMAIL o asciende esa cuenta a admin en la base de datos.',
    );
    return;
  }
  await db.insert(users).values({ username, email, passwordHash: await hashPassword(password), role: 'admin' });
  console.info(`[takumi] Administrador "${username}" creado.`);
}
