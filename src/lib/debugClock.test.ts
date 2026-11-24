import { describe, expect, it } from 'vitest';
import { formatDebugInput, parseDebugAt, readDebugState } from './debugClock';

describe('debug clock', () => {
  it('parses Chicago wall times in standard and daylight time', () => {
    expect(parseDebugAt('2026-11-23T14:30')?.toISOString()).toBe('2026-11-23T20:30:00.000Z');
    expect(parseDebugAt('2026-09-01T14:30')?.toISOString()).toBe('2026-09-01T19:30:00.000Z');
    expect(parseDebugAt('2026-11-23T14:30:05')?.toISOString()).toBe(
      '2026-11-23T20:30:05.000Z',
    );
  });

  it('accepts zoned ISO values and midnight date-only values', () => {
    expect(parseDebugAt('2026-11-23T14:30:00-06:00')?.toISOString()).toBe(
      '2026-11-23T20:30:00.000Z',
    );
    expect(parseDebugAt('2026-11-23')?.toISOString()).toBe('2026-11-23T06:00:00.000Z');
  });

  it('rejects impossible or malformed dates', () => {
    expect(parseDebugAt('2026-02-30T10:00')).toBeNull();
    expect(parseDebugAt('2026-11-23T24:00')).toBeNull();
    expect(parseDebugAt('not a date')).toBeNull();
    expect(parseDebugAt('')).toBeNull();
    expect(parseDebugAt(null)).toBeNull();
  });

  it('formats and round-trips a Chicago datetime-local value', () => {
    const at = parseDebugAt('2026-11-23T10:17:05');
    expect(formatDebugInput(new Date('2026-11-23T16:17:05.000Z'))).toBe('2026-11-23T10:17:05');
    expect(at).not.toBeNull();
    expect(formatDebugInput(at as Date)).toBe('2026-11-23T10:17:05');
  });

  it('reads the flag and optional scenario time from the URL', () => {
    expect(readDebugState('?debug=1&at=2026-11-23T10:17')).toEqual({
      enabled: true,
      at: new Date('2026-11-23T16:17:00.000Z'),
    });
    expect(readDebugState('?debug')).toEqual({ enabled: true, at: null });
    expect(readDebugState('?debug=1')).toEqual({ enabled: true, at: null });
    expect(readDebugState('?debug=0&at=2026-11-23T10:17')).toEqual({
      enabled: false,
      at: null,
    });
    expect(readDebugState('')).toEqual({ enabled: false, at: null });
  });
});
