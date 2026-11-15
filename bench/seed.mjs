// Seeds a THROWAWAY PostgreSQL database for load testing: 10,000 users (password "bench12345"),
// one launcher session each, 40 posts and 20 releases. Never run it against real data.
//
//   docker run -d --name takumi-pg-bench -e POSTGRES_PASSWORD=bench -e POSTGRES_DB=takumi -p 55432:5432 postgres:17-alpine
//   export DATABASE_URL=postgres://postgres:bench@localhost:55432/takumi
//   pnpm build && PORT=3001 ORIGIN=http://localhost:3001 ADMIN_PASSWORD=benchadmin1 node build   # creates the tables
//   node bench/seed.mjs && node bench/load.mjs http://localhost:3001
import postgres from 'postgres';
import { hash } from '@node-rs/argon2';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const USERS = 10_000;
if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to a throwaway PostgreSQL database.");
const sql = postgres(process.env.DATABASE_URL, { max: 4 });
const passwordHash = await hash('bench12345');

const [{ count }] = await sql`select count(*)::int as count from users where username like 'bench%'`;
if (count >= USERS) {
  console.log('already seeded');
} else {
  const users = Array.from({ length: USERS }, (_, i) => ({
    username: `bench${i}`,
    email: `bench${i}@bench.dev`,
    password_hash: passwordHash,
  }));
  const ids = [];
  for (let i = 0; i < users.length; i += 1000) {
    const rows = await sql`insert into users ${sql(users.slice(i, i + 1000))} returning id`;
    ids.push(...rows.map((r) => r.id));
  }
  const tokens = ids.map((_, i) => `benchtoken-${i}-${'x'.repeat(20)}`);
  const sessions = ids.map((id, i) => ({
    id: createHash('sha256').update(tokens[i]).digest('hex'),
    user_id: id,
    kind: 'launcher',
    label: 'bench',
    expires_at: new Date(Date.now() + 80 * 86400e3),
  }));
  for (let i = 0; i < sessions.length; i += 1000) await sql`insert into sessions ${sql(sessions.slice(i, i + 1000))}`;
  writeFileSync(new URL('./tokens.json', import.meta.url), JSON.stringify(tokens));

  const body = ('## Novedades\n\n' + 'Texto de ejemplo con **negrita** y [enlace](https://takumilabs.org). '.repeat(30) + '\n\n- uno\n- dos\n').repeat(4);
  const posts = Array.from({ length: 40 }, (_, i) => ({
    slug: `noticia-${i}`,
    title: `Noticia de prueba ${i}`,
    excerpt: 'Resumen de la noticia de prueba para el benchmark.',
    body,
    category: ['news', 'update', 'blog'][i % 3],
    published_at: new Date(Date.now() - i * 86400e3),
  }));
  await sql`insert into posts ${sql(posts)}`;
  const releases = Array.from({ length: 20 }, (_, i) => ({
    version: `0.${i + 1}.0`,
    notes: '- Mejora\n- Corrección\n'.repeat(5),
    download_url: `https://github.com/AloneX15/TakumiLauncher/releases/download/v0.${i + 1}.0/setup.exe`,
    published_at: new Date(Date.now() - (20 - i) * 86400e3),
  }));
  await sql`insert into releases ${sql(releases)}`;
  console.log('seeded', ids.length, 'users');
}
await sql`analyze`;
await sql.end();
