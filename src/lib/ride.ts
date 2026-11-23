import type { ServiceDay, StopId, Trip } from '../data/types';
import {
  getServiceForDate,
  nextService,
  routeForTrip,
  type NextService,
  type ServiceStatus,
} from './schedule';
import { campusClock, formatTime } from './time';

export type RideStatus =
  | 'scheduled'
  | 'reverse'
  | 'request-only'
  | 'no-service'
  | 'no-more'
  | 'same-stop';

export interface RideEstimate {
  from: StopId;
  to: StopId;
  status: RideStatus;
  service: ServiceDay | null;
  serviceStatus: ServiceStatus;
  trip: Trip | null;
  departureMinutes: number | null;
  arrivalMinutes: number | null;
  durationMinutes: number | null;
  secondsUntil: number | null;
  nextService: NextService | null;
  note: string;
}

function requestOnlyDestination(to: StopId, service: ServiceDay): boolean {
  if (to === 'erickson') return true;
  return service.trips.some((trip) => trip.requestOnly.includes(to));
}

/**
 * Estimates the next scheduled ride between two stops. The shuttle runs
 * Ramseyer → campus → Berntsen/Totino and deadheads back, so a reverse leg
 * deliberately reports no scheduled service instead of inventing a duration.
 */
export function estimateRide(now: Date, from: StopId, to: StopId): RideEstimate {
  const clock = campusClock(now);
  const info = getServiceForDate(clock.dateKey);
  const base = {
    from,
    to,
    service: info.service,
    serviceStatus: info.status,
    trip: null,
    departureMinutes: null,
    arrivalMinutes: null,
    durationMinutes: null,
    secondsUntil: null,
  } as const;

  if (from === to) {
    return {
      ...base,
      status: 'same-stop',
      nextService: null,
      note: 'Choose two different stops to estimate a ride.',
    };
  }

  if (!info.service) {
    const next = nextService(now, from);
    return {
      ...base,
      status: 'no-service',
      nextService: next,
      note: next
        ? `No daytime shuttle today. Next service leaves ${formatTime(next.first.atMinutes)}.`
        : info.reason ?? 'No daytime shuttle today.',
    };
  }

  const service = info.service;
  const requestOnly = from === 'erickson' || requestOnlyDestination(to, service);
  if (from === 'erickson' || (!service.trips.some((trip) => trip.times[from] !== undefined) && requestOnly)) {
    return {
      ...base,
      status: 'request-only',
      nextService: nextService(now, from),
      note: 'Ericksen is request-only. Call 651-631-5310 to arrange a pickup.',
    };
  }

  let reverseTrip: Trip | null = null;
  let requestTrip: Trip | null = null;

  for (const trip of [...service.trips].sort((a, b) => (a.times[from] ?? 0) - (b.times[from] ?? 0))) {
    const departure = trip.times[from];
    if (departure === undefined) continue;
    if (departure * 60 < clock.seconds) continue;

    const arrival = trip.times[to] ?? trip.dropAt?.[to];
    if (arrival !== undefined) {
      if (arrival > departure) {
        const dropOnly = trip.times[to] === undefined;
        return {
          ...base,
          status: 'scheduled',
          trip,
          departureMinutes: departure,
          arrivalMinutes: arrival,
          durationMinutes: arrival - departure,
          secondsUntil: departure * 60 - clock.seconds,
          nextService: null,
          note: `${routeForTrip(trip).id === 'via' ? 'Via Rosedale' : 'Campus loop'} · arrives ${formatTime(arrival)}${dropOnly ? ' · drop-off only' : ''}.`,
        };
      }
      reverseTrip ??= trip;
      continue;
    }

    if (trip.requestOnly.includes(to) || to === 'erickson') requestTrip ??= trip;
  }

  if (reverseTrip) {
    return {
      ...base,
      status: 'reverse',
      trip: reverseTrip,
      nextService: nextService(now, from),
      note: 'No scheduled return leg. The shuttle returns to RAM without passengers.',
    };
  }

  if (requestOnly || requestTrip) {
    return {
      ...base,
      status: 'request-only',
      trip: requestTrip,
      nextService: nextService(now, from),
      note: 'This stop is request-only. Call 651-631-5310 to arrange a pickup.',
    };
  }

  const next = nextService(now, from);
  return {
    ...base,
    status: 'no-more',
    nextService: next,
    note: next
      ? `No more rides that direction today. Next service leaves ${formatTime(next.first.atMinutes)}.`
      : 'No more scheduled rides today.',
  };
}
