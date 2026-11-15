import type { ReleaseInput } from './releases';

export function readReleaseForm(form: FormData): ReleaseInput {
  const size = String(form.get('fileSize') ?? '').trim();
  const optional = (key: string) => String(form.get(key) ?? '').trim() || null;
  return {
    version: String(form.get('version') ?? '').trim().replace(/^v/, ''),
    channel: form.get('channel') === 'beta' ? 'beta' : 'stable',
    notes: String(form.get('notes') ?? ''),
    downloadUrl: String(form.get('downloadUrl') ?? '').trim(),
    fileName: optional('fileName'),
    fileSize: size ? Number(size) : null,
    sha256: optional('sha256'),
    githubUrl: optional('githubUrl'),
    publish: form.get('publish') === 'on',
  };
}
