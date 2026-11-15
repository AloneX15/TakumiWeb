import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify, type KeyObject } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Ed25519 key that signs private instance manifests. The launcher ships the public key
 * (`TAKUMI_MANIFEST_PUBKEY` at build time) and refuses manifests that do not verify, so a tampered
 * storage bucket or proxy cannot inject files.
 *
 * Production: MANIFEST_SIGNING_KEY = base64 PKCS#8 DER of the private key
 *   node -e "console.log(require('crypto').generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'der'}).toString('base64'))"
 * Development: a key is generated once and kept in ./data/manifest-signing-key.der.
 */

const DEV_KEY_FILE = './data/manifest-signing-key.der';

let cached: KeyObject | undefined;

export class SigningKeyMissing extends Error {
  constructor() {
    super('Falta MANIFEST_SIGNING_KEY en el servidor: no se pueden publicar instancias.');
  }
}

function privateKey(): KeyObject {
  if (cached) return cached;
  const configured = env.MANIFEST_SIGNING_KEY?.trim();
  if (configured) {
    cached = createPrivateKey({ key: Buffer.from(configured, 'base64'), format: 'der', type: 'pkcs8' });
  } else if (dev || env.NODE_ENV === 'test') {
    if (!existsSync(DEV_KEY_FILE)) {
      mkdirSync(dirname(DEV_KEY_FILE), { recursive: true });
      const der = generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'der' });
      writeFileSync(DEV_KEY_FILE, der);
    }
    cached = createPrivateKey({ key: readFileSync(DEV_KEY_FILE), format: 'der', type: 'pkcs8' });
  } else {
    throw new SigningKeyMissing();
  }
  if (cached.asymmetricKeyType !== 'ed25519') throw new Error('MANIFEST_SIGNING_KEY no es una clave Ed25519.');
  return cached;
}

export function signingAvailable() {
  try {
    privateKey();
    return true;
  } catch {
    return false;
  }
}

/** Base64 Ed25519 signature of the UTF-8 bytes of `text`. */
export function signText(text: string) {
  return sign(null, Buffer.from(text, 'utf8'), privateKey()).toString('base64');
}

/** Raw 32-byte public key, base64. This is what the launcher embeds. */
export function publicKeyBase64() {
  const spki = createPublicKey(privateKey()).export({ type: 'spki', format: 'der' });
  return spki.subarray(spki.length - 32).toString('base64');
}

export function verifyText(text: string, signature: string) {
  return verify(null, Buffer.from(text, 'utf8'), createPublicKey(privateKey()), Buffer.from(signature, 'base64'));
}

/** Private key bytes, used as the secret other per-instance keys are derived from (vault keys). */
export function signingSecret() {
  return privateKey().export({ type: 'pkcs8', format: 'der' });
}
