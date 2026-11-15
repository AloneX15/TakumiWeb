import { env } from '$env/dynamic/private';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';

/**
 * Content-addressed blob store for private instance files: `<STORAGE_DIR>/objects/ab/abcdef…`.
 * A file shared by several instances or versions is stored once. Bodies are never served from a public
 * URL; the website and the launcher API stream them after checking permissions.
 */

const SHA256 = /^[0-9a-f]{64}$/;

function root() {
  return env.STORAGE_DIR?.trim() || './data/storage';
}

function objectPath(sha256: string) {
  if (!SHA256.test(sha256)) throw new Error('invalid sha256');
  return join(root(), 'objects', sha256.slice(0, 2), sha256);
}

export class TooLargeError extends Error {}

/** Streams `body` to storage while hashing it. Fails with TooLargeError past `maxBytes` and stores nothing. */
export async function putStream(body: ReadableStream<Uint8Array>, maxBytes: number) {
  const tmpDir = join(root(), 'tmp');
  await mkdir(tmpDir, { recursive: true });
  const tmp = join(tmpDir, randomUUID());
  const hash = createHash('sha256');
  const out = createWriteStream(tmp);
  let size = 0;
  try {
    const reader = body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new TooLargeError();
      }
      hash.update(value);
      if (!out.write(value)) await new Promise<void>((resolve) => out.once('drain', () => resolve()));
    }
    await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
    const sha256 = hash.digest('hex');
    await moveIntoPlace(tmp, sha256);
    return { sha256, size };
  } catch (err) {
    out.destroy();
    await rm(tmp, { force: true });
    throw err;
  }
}

export async function putBuffer(data: Uint8Array) {
  const sha256 = createHash('sha256').update(data).digest('hex');
  if (!(await exists(sha256))) {
    const tmpDir = join(root(), 'tmp');
    await mkdir(tmpDir, { recursive: true });
    const tmp = join(tmpDir, randomUUID());
    await writeFile(tmp, data);
    await moveIntoPlace(tmp, sha256);
  }
  return { sha256, size: data.byteLength };
}

async function moveIntoPlace(tmp: string, sha256: string) {
  const target = objectPath(sha256);
  if (await exists(sha256)) {
    await rm(tmp, { force: true });
    return;
  }
  await mkdir(join(root(), 'objects', sha256.slice(0, 2)), { recursive: true });
  await rename(tmp, target);
}

export async function exists(sha256: string) {
  try {
    return (await stat(objectPath(sha256))).isFile();
  } catch {
    return false;
  }
}

/** Web stream of a stored file, or null when it is missing. */
export async function openRead(sha256: string): Promise<ReadableStream<Uint8Array> | null> {
  if (!(await exists(sha256))) return null;
  return Readable.toWeb(createReadStream(objectPath(sha256))) as ReadableStream<Uint8Array>;
}

export async function readText(sha256: string, maxBytes = 2 * 1024 * 1024) {
  const stream = await openRead(sha256);
  if (!stream) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
    size += chunk.byteLength;
    if (size > maxBytes) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}
