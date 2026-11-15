/** Input rules shared by forms, the admin panel and the launcher API. Messages are user-facing (Spanish). */

export const USERNAME_RULE = 'Entre 3 y 16 caracteres: letras, números o guion bajo.';

export function checkUsername(value: string): string | null {
  return /^[A-Za-z0-9_]{3,16}$/.test(value) ? null : `Nombre de usuario no válido. ${USERNAME_RULE}`;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function checkEmail(value: string): string | null {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Correo electrónico no válido.';
}

export function checkPassword(value: string): string | null {
  if (value.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (value.length > 128) return 'La contraseña no puede tener más de 128 caracteres.';
  return null;
}

/** "Hola, ¿Qué tal?" -> "hola-que-tal" */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function checkSlug(value: string): string | null {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 120
    ? null
    : 'El slug solo puede tener letras minúsculas, números y guiones.';
}

/** Accepts "1.2.3" and pre-releases like "1.2.3-beta.1". */
export function checkVersion(value: string): string | null {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value) ? null : 'Versión no válida (formato 1.2.3 o 1.2.3-beta.1).';
}

/** Semver-style ordering: negative if a < b. A pre-release sorts before its release. */
export function compareVersions(a: string, b: string): number {
  const [coreA, preA] = splitVersion(a);
  const [coreB, preB] = splitVersion(b);
  for (let i = 0; i < 3; i++) {
    const diff = (coreA[i] ?? 0) - (coreB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  if (preA === preB) return 0;
  if (!preA) return 1;
  if (!preB) return -1;
  const partsA = preA.split('.');
  const partsB = preB.split('.');
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const x = partsA[i];
    const y = partsB[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = Number(x);
    const ny = Number(y);
    const diff = Number.isNaN(nx) || Number.isNaN(ny) ? x.localeCompare(y) : nx - ny;
    if (diff !== 0) return diff;
  }
  return 0;
}

function splitVersion(value: string): [number[], string] {
  const clean = value.trim().replace(/^v/, '');
  const dash = clean.indexOf('-');
  const core = dash === -1 ? clean : clean.slice(0, dash);
  const pre = dash === -1 ? '' : clean.slice(dash + 1);
  return [core.split('.').map((n) => Number(n) || 0), pre];
}
