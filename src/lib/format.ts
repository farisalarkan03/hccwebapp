// Formatting utilities for HCC

const WIB_TIMEZONE = 'Asia/Jakarta';

/**
 * Format a date to Indonesian WIB format
 * e.g. "27 September 2026, 08.00 WIB"
 */
export function formatDateWIB(date: string | Date, options?: {
  showTime?: boolean;
  showTimezone?: boolean;
}): string {
  const { showTime = true, showTimezone = true } = options ?? {};
  const d = typeof date === 'string' ? new Date(date) : date;

  const dateStr = d.toLocaleDateString('id-ID', {
    timeZone: WIB_TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (!showTime) return dateStr;

  const timeStr = d.toLocaleTimeString('id-ID', {
    timeZone: WIB_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(':', '.');

  return `${dateStr}, ${timeStr}${showTimezone ? ' WIB' : ''}`;
}

/**
 * Format a date to short format e.g. "27 Sep 2026"
 */
export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('id-ID', {
    timeZone: WIB_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a time range e.g. "08.00 — 17.00 WIB"
 */
export function formatTimeRange(start: string | Date, end?: string | Date | null): string {
  const startTime = new Date(start).toLocaleTimeString('id-ID', {
    timeZone: WIB_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(':', '.');

  if (!end) return `${startTime} WIB`;

  const endTime = new Date(end).toLocaleTimeString('id-ID', {
    timeZone: WIB_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(':', '.');

  return `${startTime} — ${endTime} WIB`;
}

/**
 * Format a number as Indonesian Rupiah
 * e.g. 250000 → "Rp 250.000"
 */
export function formatRupiah(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

/**
 * Format a phone number for display (mask middle digits)
 * e.g. "628123456789" → "0812 3456 789"
 */
export function formatPhoneDisplay(wa: string): string {
  // Convert 62xxx to 0xxx
  let num = wa;
  if (num.startsWith('62')) num = '0' + num.slice(2);
  // Group: 0812 3456 789
  return num.replace(/(\d{4})(\d{4})(\d{3,4})/, '$1 $2 $3');
}

/**
 * Get relative time from now in Indonesian
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const abs = Math.abs(diff);
  const future = diff < 0;

  const seconds = Math.floor(abs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let str: string;
  if (seconds < 60) str = 'baru saja';
  else if (minutes < 60) str = `${minutes} menit`;
  else if (hours < 24) str = `${hours} jam`;
  else str = `${days} hari`;

  if (str === 'baru saja') return str;
  return future ? `${str} lagi` : `${str} lalu`;
}

/**
 * Generate a URL-friendly slug from a string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Convert a datetime-local input string (assumed to be WIB / UTC+7) to ISO string in UTC
 * e.g. "2026-12-27T12:45" -> "2026-12-27T05:45:00.000Z"
 */
export function parseWIBInputToISO(datetimeLocalStr?: string | null): string | null {
  if (!datetimeLocalStr) return null;
  const trimmed = datetimeLocalStr.trim();
  if (!trimmed) return null;
  if (trimmed.includes('Z') || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const wibString = trimmed.length === 16 ? `${trimmed}:00+07:00` : `${trimmed}+07:00`;
  const d = new Date(wibString);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Format an ISO string to a datetime-local input string in WIB (Asia/Jakarta)
 * e.g. "2026-12-27T05:45:00.000Z" -> "2026-12-27T12:45"
 */
export function toDateTimeLocalWIB(isoStr?: string | null): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: WIB_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';

  let hour = getPart('hour');
  if (hour === '24') hour = '00';

  return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${hour}:${getPart('minute')}`;
}
