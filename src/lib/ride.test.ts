import { describe, expect, it } from 'vitest';
import { estimateRide } from './ride';

const at = (iso: string) => new Date(iso);

describe('ride estimator', () => {
  it('estimates the next outbound RAM to Billy trip', () => {
    const estimate = estimateRide(at('2026-11-23T13:20:00Z'), 'ramseyer', 'brc-totino');
    expect(estimate.status).toBe('scheduled');
    expect(estimate.trip?.id).toBe('mwf-1');
    expect(estimate.departureMinutes).toBe(7 * 60 + 24);
    expect(estimate.arrivalMinutes).toBe(7 * 60 + 32);
    expect(estimate.durationMinutes).toBe(8);
    expect(estimate.secondsUntil).toBe(240);
    expect(estimate.note).toContain('Campus loop');
  });

  it('skips a trip that has already left the origin', () => {
    const estimate = estimateRide(at('2026-11-23T13:25:00Z'), 'ramseyer', 'brc-totino');
    expect(estimate.trip?.id).toBe('mwf-2');
    expect(estimate.departureMinutes).toBe(7 * 60 + 36);
    expect(estimate.durationMinutes).toBe(11);
  });

  it('offers a ride to a drop-only destination', () => {
    const estimate = estimateRide(at('2026-11-23T21:01:00Z'), 'ramseyer', 'brc-totino');
    expect(estimate.status).toBe('scheduled');
    expect(estimate.trip?.id).toBe('mwf-14');
    expect(estimate.arrivalMinutes).toBe(15 * 60 + 22);
    expect(estimate.note).toContain('drop-off only');
  });

  it('does not invent an inbound Billy to RAM ride', () => {
    const estimate = estimateRide(at('2026-11-23T13:20:00Z'), 'brc-totino', 'ramseyer');
    expect(estimate.status).toBe('reverse');
    expect(estimate.durationMinutes).toBeNull();
    expect(estimate.note).toContain('without passengers');
  });

  it('reports request-only Ericksen instead of a scheduled time', () => {
    const estimate = estimateRide(at('2026-11-23T13:20:00Z'), 'ramseyer', 'erickson');
    expect(estimate.status).toBe('request-only');
    expect(estimate.durationMinutes).toBeNull();
    expect(estimate.note).toContain('651-631-5310');
  });

  it('reports closure and weekend service without a fake countdown', () => {
    const weekend = estimateRide(at('2026-11-28T18:00:00Z'), 'ramseyer', 'brc-totino');
    expect(weekend.status).toBe('no-service');
    expect(weekend.departureMinutes).toBeNull();
    expect(weekend.nextService?.dateKey).toBe('2026-11-30');

    const late = estimateRide(at('2026-11-23T21:22:00Z'), 'ramseyer', 'brc-totino');
    expect(late.status).toBe('no-more');
    expect(late.nextService?.dateKey).toBe('2026-11-24');
  });
});
