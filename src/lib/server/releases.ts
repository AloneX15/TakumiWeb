import { eq } from 'drizzle-orm';
import { checkUrl, checkVersion } from '$lib/validation';
import { invalidateContent } from './cache';
import { db } from './db';
import { releases, type ReleaseChannel } from './db/schema';

export type ReleaseInput = {
  version: string;
  channel: ReleaseChannel;
  notes: string;
  downloadUrl: string;
  fileName: string | null;
  fileSize: number | null;
  sha256: string | null;
  githubUrl: string | null;
  publish: boolean;
};

export { checkUrl };

export function validateRelease(input: ReleaseInput): string | null {
  return (
    checkVersion(input.version) ??
    (input.downloadUrl ? checkUrl(input.downloadUrl, 'Enlace de descarga') : 'Falta el enlace de descarga.') ??
    checkUrl(input.githubUrl, 'Enlace de GitHub') ??
    (input.sha256 && !/^[a-f0-9]{64}$/i.test(input.sha256) ? 'SHA-256 no válido (64 caracteres hexadecimales).' : null) ??
    (input.fileSize !== null && (!Number.isSafeInteger(input.fileSize) || input.fileSize < 0)
      ? 'Tamaño de archivo no válido.'
      : null)
  );
}

/**
 * True when `input` would point an already published version at a different installer. Launchers
 * and visitors may already have downloaded the original, so a new build needs a new version.
 */
export async function changesPublishedInstaller(input: ReleaseInput) {
  const [existing] = await db.select().from(releases).where(eq(releases.version, input.version)).limit(1);
  if (!existing?.publishedAt) return false;
  const sameHash = (existing.sha256 ?? '') === (input.sha256?.toLowerCase() ?? '');
  return existing.downloadUrl !== input.downloadUrl || !sameHash;
}

/** Create or update a release by version. Publishing keeps the original publish date. */
export async function upsertRelease(input: ReleaseInput) {
  const [existing] = await db.select().from(releases).where(eq(releases.version, input.version)).limit(1);
  const values = {
    version: input.version,
    channel: input.channel,
    notes: input.notes,
    downloadUrl: input.downloadUrl,
    fileName: input.fileName,
    fileSize: input.fileSize,
    sha256: input.sha256?.toLowerCase() ?? null,
    githubUrl: input.githubUrl,
    publishedAt: input.publish ? (existing?.publishedAt ?? new Date()) : null,
  };
  if (existing) {
    const [row] = await db.update(releases).set(values).where(eq(releases.id, existing.id)).returning();
    invalidateContent();
    return { release: row, created: false };
  }
  const [row] = await db.insert(releases).values(values).returning();
  invalidateContent();
  return { release: row, created: true };
}
