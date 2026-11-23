export const CAMPUS_TZ = 'America/Chicago';

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CAMPUS_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  weekday: 'short',
});

export interface CampusClock {
  dateKey: string;
  weekday: string;
  hour: number;
  minute: number;
  second: number;
  minutes: number;
  seconds: number;
}

export function campusClock(now: Date): CampusClock {
  const parts = partsFormatter.formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  const hour = Number(value('hour'));
  const minute = Number(value('minute'));
  const second = Number(value('second'));
  return {
    dateKey: `${value('year')}-${value('month')}-${value('day')}`,
    weekday: value('weekday'),
    hour,
    minute,
    second,
    minutes: hour * 60 + minute,
    seconds: hour * 3600 + minute * 60 + second,
  };
}

export function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function weekdayIndex(dateKey: string): number {
  return new Date(`${dateKey}T12:00:00Z`).getUTCDay();
}

export function formatDateKey(dateKey: string, opts: { weekday?: boolean; year?: boolean } = {}): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: opts.weekday === false ? undefined : 'short',
    month: 'short',
    day: 'numeric',
    ...(opts.year ? { year: 'numeric' } : {}),
  }).format(date);
}

export function formatTime(minutes: number): string {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${hour24 >= 12 ? 'PM' : 'AM'}`;
}

export function formatCountdown(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  if (total >= 86400) {
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    return `${days}d ${String(hours).padStart(2, '0')}h`;
  }
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatRelative(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes}m ${total % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
