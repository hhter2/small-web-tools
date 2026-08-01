export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  const base = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(base)),
    sizes.length - 1,
  );
  return `${Number((bytes / (base ** index)).toFixed(2))} ${sizes[index]}`;
}

export function formatDocumentDate(dateValue, locale) {
  if (!dateValue) return '—';
  let value = String(dateValue).trim();
  if (value.startsWith('D:')) {
    value = value.slice(2);
    value = `${value.slice(0, 4)}-${value.slice(4, 6) || '01'}-${value.slice(6, 8) || '01'}T${value.slice(8, 10) || '00'}:${value.slice(10, 12) || '00'}:${value.slice(12, 14) || '00'}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(dateValue);
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDurationMinutes(value) {
  if (!value) return '';
  let minutes = Number.parseInt(value, 10);
  if (Number.isNaN(minutes)) {
    const match = String(value).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
    if (!match) return value;
    minutes = Number.parseInt(match[1] || '0', 10) * 60
      + Number.parseInt(match[2] || '0', 10);
  }
  if (minutes <= 0) return '';
  const parts = [];
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remainingMinutes = minutes % 60;
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (remainingMinutes > 0 || parts.length === 0) parts.push(`${remainingMinutes}m`);
  return `${parts.join(' ')} (${minutes} mins)`;
}
