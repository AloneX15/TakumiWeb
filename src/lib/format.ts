const dateFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const dateTimeFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

export function formatDate(value: Date | string | null | undefined) {
  return value ? dateFormat.format(new Date(value)) : '—';
}

export function formatDateTime(value: Date | string | null | undefined) {
  return value ? dateTimeFormat.format(new Date(value)) : '—';
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export const CATEGORY_LABELS = { news: 'Noticia', update: 'Actualización', blog: 'Blog' } as const;
export const ROLE_LABELS = { user: 'Usuario', editor: 'Editor', admin: 'Administrador' } as const;
