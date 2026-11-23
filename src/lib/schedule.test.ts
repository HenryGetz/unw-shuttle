import { describe, expect, it } from 'vitest';
import { FINALS_SERVICE, MWF_SERVICE, TR_SERVICE } from '../data/schedule';
import { ROUTE_BYPASS, ROUTE_VIA } from '../data/route';
import {
  billyStopForService,
  busStateAt,
  getServiceForDate,
  nextDeparture,
  nextService,
  pointAtDistance,
  routeForTrip,
  timedStops,
  tripWindow,
} from './schedule';
import { addDays, campusClock, formatCountdown, formatTime } from './time';

const at = (iso: string) => new Date(iso);

describe('time helpers', () => {
  it('formats campus time and countdowns', () => {
    expect(formatTime(424)).toBe('7:04 AM');
    expect(formatTime(1440)).toBe('12:00 AM');
    expect(formatTime(1439)).toBe('11:59 PM');
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(59)).toBe('00:59');
    expect(formatCountdown(61)).toBe('01:01');
    expect(formatCountdown(3661)).toBe('1:01:01');
    expect(formatCountdown(90061)).toBe('1d 01h');
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
  });

  it('reads America/Chicago wall time', () => {
    const clock = campusClock(at('2026-11-23T13:20:05Z'));
    expect(clock.dateKey).toBe('2026-11-23');
    expect(clock.weekday).toBe('Mon');
    expect(clock.hour).toBe(7);
    expect(clock.minute).toBe(20);
    expect(clock.second).toBe(5);
    expect(clock.minutes).toBe(440);
  });
});

describe('service calendar', () => {
  it('chooses weekday schedules', () => {
    expect(getServiceForDate('2026-11-23').service?.kind).toBe('mwf');
    expect(getServiceForDate('2026-11-24').service?.kind).toBe('tr');
    expect(getServiceForDate('2026-11-25').status).toBe('closure');
    expect(getServiceForDate('2026-11-27').status).toBe('closure');
    expect(getServiceForDate('2026-11-28').status).toBe('closure');
    expect(getServiceForDate('2026-11-30').service?.kind).toBe('mwf');
    expect(getServiceForDate('2026-12-05').status).toBe('weekend');
  });

  it('handles finals, breaks, and holidays', () => {
    expect(getServiceForDate('2026-12-14').status).toBe('finals');
    expect(getServiceForDate('2026-12-14').service?.kind).toBe('finals');
    expect(getServiceForDate('2026-12-17').status).toBe('finals');
    expect(getServiceForDate('2026-12-18').status).toBe('closure');
    expect(getServiceForDate('2026-12-24').status).toBe('closure');
    expect(getServiceForDate('2027-01-10').status).toBe('closure');
    expect(getServiceForDate('2027-01-11').service?.kind).toBe('mwf');
    expect(getServiceForDate('2027-01-18').status).toBe('closure');
    expect(getServiceForDate('2027-03-04').status).toBe('closure');
    expect(getServiceForDate('2027-03-14').status).toBe('closure');
    expect(getServiceForDate('2027-03-15').service?.kind).toBe('mwf');
    expect(getServiceForDate('2027-03-22').status).toBe('closure');
    expect(getServiceForDate('2027-03-26').status).toBe('closure');
    expect(getServiceForDate('2027-03-29').status).toBe('closure');
    expect(getServiceForDate('2027-03-30').service?.kind).toBe('tr');
  });
});

describe('schedule data', () => {
  it('has the expected trip counts and ordered times', () => {
    expect(MWF_SERVICE.trips).toHaveLength(14);
    expect(TR_SERVICE.trips).toHaveLength(11);
    expect(FINALS_SERVICE.trips).toHaveLength(10);

    for (const service of [MWF_SERVICE, TR_SERVICE, FINALS_SERVICE]) {
      for (const trip of service.trips) {
        const entries = Object.entries(trip.times) as [string, number][];
        expect(entries.length).toBeGreaterThan(0);
        for (const [, minutes] of entries) {
          expect(minutes).toBeGreaterThanOrEqual(6 * 60);
          expect(minutes).toBeLessThan(18 * 60);
        }
        const ordered = [...entries].sort((a, b) => a[1] - b[1]).map(([id]) => id);
        const route = routeForTrip(trip);
        const actual = timedStops(trip, route).map((stop) => stop.id);
        expect(actual).toEqual(ordered);
        for (const stop of trip.requestOnly) expect(trip.times[stop]).toBeUndefined();
        for (const stop of trip.dropOnly) expect(trip.times[stop]).toBeUndefined();
      }
    }
  });

  it('uses the bypass unless Rosedale is on the trip', () => {
    expect(routeForTrip(MWF_SERVICE.trips[0])).toBe(ROUTE_BYPASS);
    expect(routeForTrip(MWF_SERVICE.trips[1])).toBe(ROUTE_VIA);
    expect(routeForTrip(MWF_SERVICE.trips[4])).toBe(ROUTE_BYPASS);
    expect(timedStops(MWF_SERVICE.trips[4], ROUTE_BYPASS).map((stop) => stop.id)).not.toContain('rosedale');
    expect(ROUTE_BYPASS.stopAt.rosedale).toBeUndefined();
    expect(ROUTE_VIA.stopAt.rosedale).toBeGreaterThan(1000);
  });

  it('corrects the finals PDF 11:00 PM typo', () => {
    const row = FINALS_SERVICE.trips[5];
    expect(row.times.ramseyer).toBe(11 * 60);
    expect(row.note).toContain('11:00 AM');
    expect(FINALS_SERVICE.trips[9].dropOnly).toContain('brc-totino');
    expect(FINALS_SERVICE.trips[9].times['brc-totino']).toBeUndefined();
    expect(FINALS_SERVICE.trips[9].dropAt?.['brc-totino']).toBe(15 * 60 + 38);
    expect(tripWindow(FINALS_SERVICE.trips[9]).last).toBe(15 * 60 + 38);
    expect(timedStops(FINALS_SERVICE.trips[9], routeForTrip(FINALS_SERVICE.trips[9]), true).at(-1)?.id).toBe('brc-totino');
    expect(MWF_SERVICE.trips[13].dropAt?.['brc-totino']).toBe(15 * 60 + 22);
  });

  it('has monotonic trip windows', () => {
    for (const service of [MWF_SERVICE, TR_SERVICE, FINALS_SERVICE]) {
      const windows = service.trips.map(tripWindow);
      for (let index = 0; index < windows.length; index += 1) {
        expect(windows[index].first).toBeLessThan(windows[index].last);
        if (index > 0) expect(windows[index].first).toBeGreaterThan(windows[index - 1].last);
      }
    }
  });
});

describe('departures', () => {
  it('counts down to the next RAM departure', () => {
    const early = at('2026-11-23T13:20:00Z');
    expect(nextDeparture(early, 'ramseyer')?.atMinutes).toBe(7 * 60 + 24);
    expect(nextDeparture(early, 'ramseyer')?.secondsUntil).toBe(240);

    const missed = at('2026-11-23T13:25:00Z');
    expect(nextDeparture(missed, 'ramseyer')?.atMinutes).toBe(7 * 60 + 36);
  });

  it('returns null after the last departure', () => {
    expect(nextDeparture(at('2026-11-23T21:21:00Z'), 'ramseyer')).toBeNull();
    expect(nextDeparture(at('2026-11-28T18:00:00Z'), 'ramseyer')).toBeNull();
  });

  it('finds the next service day', () => {
    const saturday = at('2026-11-28T18:00:00Z');
    const next = nextService(saturday, 'ramseyer');
    expect(next?.dateKey).toBe('2026-11-30');
    expect(next?.daysAhead).toBe(2);
    expect(next?.first.atMinutes).toBe(7 * 60 + 24);

    const afterLast = at('2026-11-23T21:22:00Z');
    expect(nextService(afterLast, 'ramseyer')?.dateKey).toBe('2026-11-24');
    expect(nextService(afterLast, 'ramseyer')?.first.atMinutes).toBe(7 * 60 + 35);

    const christmas = nextService(at('2026-12-24T18:00:00Z'), 'ramseyer');
    expect(christmas?.dateKey).toBe('2027-01-11');
    expect(christmas?.daysAhead).toBe(18);
  });

  it('uses Graham for the Billy during finals', () => {
    const finalsMorning = at('2026-12-14T14:00:00Z');
    expect(nextDeparture(finalsMorning, 'graham')?.atMinutes).toBe(9 * 60 + 6);
    expect(nextDeparture(finalsMorning, 'brc-totino')?.atMinutes).toBe(9 * 60 + 8);
    expect(billyStopForService(getServiceForDate('2026-12-14').service)).toBe('graham');
    expect(billyStopForService(getServiceForDate('2026-11-23').service)).toBe('brc-totino');
    expect(billyStopForService(null)).toBe('brc-totino');
  });
});

describe('bus position', () => {
  it('drives the active trip', () => {
    const state = busStateAt(at('2026-11-23T13:25:00Z'));
    expect(state.phase).toBe('in-service');
    expect(state.trip?.id).toBe('mwf-1');
    expect(state.prevStop).toBe('ramseyer');
    expect(state.nextStop).toBe('akenson');
    expect(state.position.x).toBeGreaterThan(-36);
    expect(state.position.z).toBeGreaterThan(299);
    expect(state.secondsToNextStop).toBeGreaterThan(0);
  });

  it('returns to Ramseyer between trips', () => {
    const returning = busStateAt(at('2026-11-23T13:33:00Z'));
    expect(returning.phase).toBe('returning');
    expect(returning.label).toContain('Returning');

    const parked = busStateAt(at('2026-11-23T13:35:40Z'));
    expect(parked.phase).toBe('parked');
    expect(parked.prevStop).toBeNull();
    expect(parked.nextStop).toBe('ramseyer');
    expect(parked.label).toContain('7:36 AM');
    expect(parked.route.id).toBe('via');

    const midMorning = busStateAt(at('2026-11-23T15:17:00Z'));
    expect(midMorning.phase).toBe('parked');
    expect(midMorning.label).toContain('9:52 AM');
    expect(midMorning.route.id).toBe('bypass');

    const nextTrip = busStateAt(at('2026-11-23T13:37:00Z'));
    expect(nextTrip.phase).toBe('in-service');
    expect(nextTrip.trip?.id).toBe('mwf-2');
  });

  it('parks after the last trip and goes off on weekends', () => {
    const returningLate = busStateAt(at('2026-11-23T21:30:00Z'));
    expect(returningLate.phase).toBe('returning');

    const late = busStateAt(at('2026-11-23T21:35:00Z'));
    expect(late.phase).toBe('parked');
    expect(late.label).toContain('3:22 PM');

    const weekend = busStateAt(at('2026-12-05T18:00:00Z'));
    expect(weekend.phase).toBe('off');
    expect(weekend.status).toBe('weekend');
  });

  it('keeps the route point finite and near the selected stop', () => {
    const point = pointAtDistance(ROUTE_VIA, ROUTE_VIA.stopAt.rosedale ?? 0);
    expect(Number.isFinite(point.heading)).toBe(true);
    expect(Math.hypot(point.x - -175.7, point.z - 1254.1)).toBeLessThan(20);
  });
});
