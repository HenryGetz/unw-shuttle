import { describe, expect, it } from 'vitest';
import { STOP_ORDER } from '../data/route';
import { MAX_PINNED_STOPS, PIN_PRESETS, isStopId, normalizePinnedStops } from './prefs';

describe('personalization preferences', () => {
  it('keeps unique, valid stops in order and caps the list', () => {
    const normalized = normalizePinnedStops([
      'ramseyer',
      'nope',
      'rosedale',
      'ramseyer',
      'erickson',
      'akenson',
      'brc-totino',
    ]);

    expect(normalized).toEqual(['ramseyer', 'rosedale', 'erickson']);
    expect(normalized).toHaveLength(MAX_PINNED_STOPS);
    expect(normalizePinnedStops('ramseyer')).toEqual([]);
  });

  it('accepts only published stop ids', () => {
    for (const stop of STOP_ORDER) expect(isStopId(stop)).toBe(true);
    expect(isStopId('graham')).toBe(true);
    expect(isStopId('wilson')).toBe(false);
    expect(isStopId(null)).toBe(false);
  });

  it('keeps every preset inside the published stops', () => {
    for (const preset of PIN_PRESETS) {
      expect(preset.stops.length).toBeGreaterThan(0);
      expect(preset.stops.length).toBeLessThanOrEqual(MAX_PINNED_STOPS);
      for (const stop of preset.stops) expect(STOP_ORDER).toContain(stop);
    }
  });
});
