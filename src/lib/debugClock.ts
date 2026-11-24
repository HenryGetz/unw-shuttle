import { campusClock } from './time';

export interface DebugClockState {
  enabled: boolean;
  at: Date | null;
}

const WALL_TIME = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const ZONED_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/;

function utcTimestamp(year: number, month: number, day: number, hour = 0, minute = 0, second = 0) {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  return date.getTime();
}

function validWallTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): boolean {
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return false;
  }
  const date = new Date(utcTimestamp(year, month, day, hour, minute, second));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Chicago's UTC offset at an instant, in milliseconds. */
function chicagoOffsetMs(date: Date): number {
  const clock = campusClock(date);
  const [year, month, day] = clock.dateKey.split('-').map(Number);
  const wall = utcTimestamp(year, month, day, clock.hour, clock.minute, clock.second);
  return wall - (date.getTime() - date.getMilliseconds());
}

/** Interpret a wall-clock time as America/Chicago, including DST. */
function chicagoWallTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): Date | null {
  if (!validWallTime(year, month, day, hour, minute, second)) return null;
  const wall = utcTimestamp(year, month, day, hour, minute, second);
  let candidate = wall;
  for (let pass = 0; pass < 2; pass += 1) {
    candidate = wall - chicagoOffsetMs(new Date(candidate));
  }
  return new Date(candidate);
}

/**
 * Parses `2026-11-23T10:17`, a Chicago wall time, or an ISO timestamp with an
 * explicit offset. Returns null for anything that is not a real date/time.
 */
export function parseDebugAt(value: string | null | undefined): Date | null {
  if (!value) return null;
  const raw = value.trim();

  const wall = WALL_TIME.exec(raw);
  if (wall) {
    return chicagoWallTime(
      Number(wall[1]),
      Number(wall[2]),
      Number(wall[3]),
      Number(wall[4]),
      Number(wall[5]),
      Number(wall[6] ?? 0),
    );
  }

  const dateOnly = DATE_ONLY.exec(raw);
  if (dateOnly) {
    return chicagoWallTime(Number(dateOnly[1]), Number(dateOnly[2]), Number(dateOnly[3]), 0, 0, 0);
  }

  if (ZONED_TIME.test(raw)) {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/** Format for a `datetime-local` input, always in campus time. */
export function formatDebugInput(date: Date): string {
  const clock = campusClock(date);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${clock.dateKey}T${pad(clock.hour)}:${pad(clock.minute)}:${pad(clock.second)}`;
}

export function readDebugState(search: string): DebugClockState {
  const params = new URLSearchParams(search);
  const flag = params.get('debug')?.toLowerCase() ?? '';
  const enabled = params.has('debug') && flag !== '0' && flag !== 'false' && flag !== 'off';
  return {
    enabled,
    at: enabled ? parseDebugAt(params.get('at')) : null,
  };
}

/** Keep the address bar shareable without reloading the app. */
export function writeDebugState(state: DebugClockState): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (state.enabled) {
    url.searchParams.set('debug', '1');
  } else {
    url.searchParams.delete('debug');
    url.searchParams.delete('at');
  }
  if (state.at) {
    url.searchParams.set('at', formatDebugInput(state.at));
  } else {
    url.searchParams.delete('at');
  }
  window.history.replaceState(window.history.state, '', url);
}
