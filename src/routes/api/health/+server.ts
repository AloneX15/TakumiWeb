import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

/** GET /api/health — liveness + database check for Docker / load balancers. */
export const GET: RequestHandler = async () => {
  try {
    await db.execute(sql`select 1`);
    return json({ ok: true });
  } catch {
    return json({ ok: false }, { status: 503 });
  }
};
