import { CLOSURES, FINALS, inRange } from '../data/calendar';
import { FINALS_SERVICE, MWF_SERVICE, TR_SERVICE } from '../data/schedule';
import {
  BILLY_FINALS_STOP,
  BILLY_REGULAR_STOP,
  ROUTE_BYPASS,
  ROUTE_VIA,
  STOPS,
  STOP_ORDER,
} from '../data/route';
import type { RouteVariant, ServiceDay, StopId, Trip } from '../data/types';
import { addDays, campusClock, formatTime, weekdayIndex, type CampusClock } from './time';

export type ServiceStatus = 'service' | 'finals' | 'weekend' | 'closure';

export interface ServiceInfo {
  service: ServiceDay | null;
  status: ServiceStatus;
  reason?: string;
}

export interface ServiceSnapshot extends ServiceInfo {
  clock: CampusClock;
}

export interface Departure {
  stopId: StopId;
  trip: Trip;
  atMinutes: number;
  secondsUntil: number;
}

export interface NextService {
  dateKey: string;
  daysAhead: number;
  service: ServiceDay;
  first: Departure;
}

export interface BusState {
  phase: 'in-service' | 'returning' | 'parked' | 'off';
  position: { x: number; z: number };
  heading: number;
  route: RouteVariant;
  trip: Trip | null;
  prevStop: StopId | null;
  nextStop: StopId | null;
  progress: number;
  label: string;
  secondsToNextStop: number | null;
  clock: CampusClock;
  service: ServiceDay | null;
  status: ServiceStatus;
}

export function getServiceForDate(dateKey: string): ServiceInfo {
  const closure = CLOSURES.find((range) => inRange(dateKey, range));
  if (closure) return { service: null, status: 'closure', reason: closure.label };
  if (FINALS.some((range) => inRange(dateKey, range))) {
    return { service: FINALS_SERVICE, status: 'finals' };
  }
  const day = weekdayIndex(dateKey);
  if (day === 0 || day === 6) {
    return { service: null, status: 'weekend', reason: 'Weekend — evening shuttle only' };
  }
  if (day === 2 || day === 4) return { service: TR_SERVICE, status: 'service' };
  return { service: MWF_SERVICE, status: 'service' };
}

export function serviceInfoAt(now: Date): ServiceSnapshot {
  const clock = campusClock(now);
  return { clock, ...getServiceForDate(clock.dateKey) };
}

export function routeForTrip(trip: Trip): RouteVariant {
  return trip.times.rosedale !== undefined ? ROUTE_VIA : ROUTE_BYPASS;
}

export function tripWindow(trip: Trip): { first: number; last: number } {
  const times = STOP_ORDER.flatMap((id) => {
    const value = trip.times[id] ?? trip.dropAt?.[id];
    return value === undefined ? [] : [value];
  });
  return { first: Math.min(...times), last: Math.max(...times) };
}

export function timedStops(trip: Trip, route: RouteVariant, includeDrop = false) {
  return STOP_ORDER.flatMap((id) => {
    const at = trip.times[id] ?? (includeDrop ? trip.dropAt?.[id] : undefined);
    const dist = route.stopAt[id];
    if (at === undefined || dist === undefined) return [];
    return [{ id, at, dist }];
  }).sort((a, b) => a.at - b.at);
}

export function departuresForStop(service: ServiceDay, stopId: StopId): { trip: Trip; atMinutes: number }[] {
  return service.trips
    .flatMap((trip) => {
      const at = trip.times[stopId];
      return at === undefined ? [] : [{ trip, atMinutes: at }];
    })
    .sort((a, b) => a.atMinutes - b.atMinutes);
}

export function nextDeparture(now: Date, stopId: StopId): Departure | null {
  const clock = campusClock(now);
  const info = getServiceForDate(clock.dateKey);
  if (!info.service) return null;
  const candidate = departuresForStop(info.service, stopId).find(
    (entry) => entry.atMinutes * 60 >= clock.seconds,
  );
  if (!candidate) return null;
  return {
    stopId,
    trip: candidate.trip,
    atMinutes: candidate.atMinutes,
    secondsUntil: candidate.atMinutes * 60 - clock.seconds,
  };
}

export interface StopVisit {
  stopId: StopId;
  trip: Trip;
  atMinutes: number;
  secondsUntil: number;
  /** The bus stops only to let riders off, so this is an arrival, not a pickup. */
  dropOffOnly: boolean;
}

function visitsForStop(service: ServiceDay, stopId: StopId): Omit<StopVisit, 'stopId' | 'secondsUntil'>[] {
  return service.trips
    .flatMap((trip) => {
      const scheduled = trip.times[stopId];
      const at = scheduled ?? trip.dropAt?.[stopId];
      if (at === undefined) return [];
      return [{ trip, atMinutes: at, dropOffOnly: scheduled === undefined }];
    })
    .sort((a, b) => a.atMinutes - b.atMinutes);
}

/** Every time the bus shows up at a stop, including drop-off-only arrivals. */
export function nextVisits(now: Date, stopId: StopId, limit = 3): StopVisit[] {
  const clock = campusClock(now);
  const info = getServiceForDate(clock.dateKey);
  if (!info.service) return [];
  return visitsForStop(info.service, stopId)
    .filter((entry) => entry.atMinutes * 60 >= clock.seconds)
    .slice(0, limit)
    .map((entry) => ({
      ...entry,
      stopId,
      secondsUntil: entry.atMinutes * 60 - clock.seconds,
    }));
}

export function nextDepartures(now: Date, stopId: StopId, limit = 3): Departure[] {
  const clock = campusClock(now);
  const info = getServiceForDate(clock.dateKey);
  if (!info.service) return [];
  return departuresForStop(info.service, stopId)
    .filter((entry) => entry.atMinutes * 60 >= clock.seconds)
    .slice(0, limit)
    .map((entry) => ({
      stopId,
      trip: entry.trip,
      atMinutes: entry.atMinutes,
      secondsUntil: entry.atMinutes * 60 - clock.seconds,
    }));
}

export function nextService(now: Date, stopId: StopId): NextService | null {
  const clock = campusClock(now);
  for (let daysAhead = 0; daysAhead <= 45; daysAhead += 1) {
    const dateKey = addDays(clock.dateKey, daysAhead);
    const info = getServiceForDate(dateKey);
    if (!info.service) continue;
    const departures = departuresForStop(info.service, stopId);
    const candidate =
      daysAhead === 0
        ? departures.find((entry) => entry.atMinutes * 60 > clock.seconds)
        : departures[0];
    if (!candidate) continue;
    const secondsUntil =
      daysAhead === 0
        ? candidate.atMinutes * 60 - clock.seconds
        : daysAhead * 86400 + candidate.atMinutes * 60 - clock.seconds;
    return {
      dateKey,
      daysAhead,
      service: info.service,
      first: {
        stopId,
        trip: candidate.trip,
        atMinutes: candidate.atMinutes,
        secondsUntil,
      },
    };
  }
  return null;
}

const routeCumulative = new WeakMap<RouteVariant, number[]>();

function cumulative(route: RouteVariant): number[] {
  const cached = routeCumulative.get(route);
  if (cached) return cached;
  const values = [0];
  for (let index = 1; index < route.points.length; index += 1) {
    const [x1, z1] = route.points[index - 1];
    const [x2, z2] = route.points[index];
    values.push(values[index - 1] + Math.hypot(x2 - x1, z2 - z1));
  }
  routeCumulative.set(route, values);
  return values;
}

export function pointAtDistance(route: RouteVariant, distance: number): { x: number; z: number; heading: number } {
  const points = route.points;
  const cum = cumulative(route);
  const total = cum[cum.length - 1];
  const clamped = Math.max(0, Math.min(total, distance));
  let low = 0;
  let high = cum.length - 1;
  while (low < high - 1) {
    const mid = Math.floor((low + high) / 2);
    if (cum[mid] <= clamped) low = mid;
    else high = mid;
  }
  const a = points[low];
  const b = points[Math.min(points.length - 1, low + 1)];
  const segment = cum[Math.min(cum.length - 1, low + 1)] - cum[low] || 1;
  const t = Math.max(0, Math.min(1, (clamped - cum[low]) / segment));
  const x = a[0] + (b[0] - a[0]) * t;
  const z = a[1] + (b[1] - a[1]) * t;
  return { x, z, heading: Math.atan2(b[0] - a[0], b[1] - a[1]) };
}

export function busStateAt(now: Date): BusState {
  const clock = campusClock(now);
  const info = getServiceForDate(clock.dateKey);
  const route = ROUTE_VIA;
  const parked = pointAtDistance(route, route.stopAt.ramseyer ?? 0);
  const base = {
    clock,
    service: info.service,
    status: info.status,
    route,
  } as const;

  if (!info.service) {
    return {
      ...base,
      phase: 'off',
      position: { x: parked.x, z: parked.z },
      heading: parked.heading,
      trip: null,
      prevStop: null,
      nextStop: null,
      progress: 0,
      label: info.reason ?? 'No service today',
      secondsToNextStop: null,
    };
  }

  const trips = info.service.trips;
  const active = trips.find((trip) => {
    const window = tripWindow(trip);
    return clock.seconds >= window.first * 60 && clock.seconds <= window.last * 60;
  });

  if (active) {
    const activeRoute = routeForTrip(active);
    const stops = timedStops(active, activeRoute, true);
    const nowMinutes = clock.seconds / 60;
    let index = stops.findIndex(
      (stop, i) => i < stops.length - 1 && nowMinutes >= stop.at && nowMinutes < stops[i + 1].at,
    );
    if (index < 0) index = Math.max(0, stops.length - 2);
    const from = stops[index];
    const to = stops[Math.min(stops.length - 1, index + 1)];
    const span = Math.max(1 / 60, to.at - from.at);
    const t = Math.max(0, Math.min(1, (nowMinutes - from.at) / span));
    const distance = from.dist + (to.dist - from.dist) * t;
    const point = pointAtDistance(activeRoute, distance);
    const atFrom = t < 0.03;
    const atTo = t > 0.97;
    return {
      ...base,
      route: activeRoute,
      phase: 'in-service',
      position: { x: point.x, z: point.z },
      heading: point.heading,
      trip: active,
      prevStop: from.id,
      nextStop: to.id,
      progress: t,
      label: atFrom
        ? `Departing ${STOPS[from.id].shortName}`
        : atTo
          ? `At ${STOPS[to.id].shortName}`
          : `Between ${STOPS[from.id].shortName} and ${STOPS[to.id].shortName}`,
      secondsToNextStop: Math.max(0, Math.round(to.at * 60 - clock.seconds)),
    };
  }

  const previous = trips
    .filter((trip) => tripWindow(trip).last * 60 <= clock.seconds)
    .sort((a, b) => tripWindow(b).last - tripWindow(a).last)[0];
  const upcoming = trips
    .filter((trip) => tripWindow(trip).first * 60 > clock.seconds)
    .sort((a, b) => tripWindow(a).first - tripWindow(b).first)[0];

  if (previous) {
    const previousRoute = routeForTrip(previous);
    const previousStops = timedStops(previous, previousRoute, true);
    const last = previousStops[previousStops.length - 1];
    const lastSeconds = last.at * 60;
    const returnStart = lastSeconds + 45;
    const nextStart = upcoming ? tripWindow(upcoming).first * 60 : lastSeconds + 15 * 60;
    const returnEnd = Math.min(nextStart - 30, returnStart + 8 * 60);

    if (returnEnd > returnStart && clock.seconds >= returnStart && clock.seconds < returnEnd) {
      const progress = (clock.seconds - returnStart) / (returnEnd - returnStart);
      const distance = last.dist * (1 - progress);
      const point = pointAtDistance(previousRoute, distance);
      return {
        ...base,
        route: previousRoute,
        phase: 'returning',
        position: { x: point.x, z: point.z },
        heading: point.heading + Math.PI,
        trip: previous,
        prevStop: last.id,
        nextStop: 'ramseyer',
        progress,
        label: 'Returning to Ramseyer',
        secondsToNextStop: null,
      };
    }

    if (clock.seconds < returnStart) {
      const point = pointAtDistance(previousRoute, last.dist);
      return {
        ...base,
        route: previousRoute,
        phase: 'parked',
        position: { x: point.x, z: point.z },
        heading: point.heading,
        trip: previous,
        prevStop: last.id,
        nextStop: null,
        progress: 1,
        label: `Parked at ${STOPS[last.id].shortName}`,
        secondsToNextStop: null,
      };
    }
  }

  const lastTrip = trips[trips.length - 1];
  const lastWindow = tripWindow(lastTrip);
  const upcomingFirst = upcoming ? tripWindow(upcoming).first : null;
  const parkedRoute = upcoming
    ? routeForTrip(upcoming)
    : previous
      ? routeForTrip(previous)
      : ROUTE_VIA;
  return {
    ...base,
    route: parkedRoute,
    phase: 'parked',
    position: { x: parked.x, z: parked.z },
    heading: parked.heading,
    trip: upcoming ?? previous ?? null,
    prevStop: null,
    nextStop: upcoming ? 'ramseyer' : null,
    progress: 0,
    label: upcomingFirst !== null
      ? `Parked at Ramseyer · next trip ${formatTime(upcomingFirst)}`
      : `Service ended · last trip ${formatTime(lastWindow.last)}`,
    secondsToNextStop: null,
  };
}

export function billyStopForService(service: ServiceDay | null): StopId {
  return service?.kind === 'finals' ? BILLY_FINALS_STOP : BILLY_REGULAR_STOP;
}

export function serviceBadge(info: ServiceInfo): string {
  if (info.status === 'finals') return 'Finals';
  if (info.status === 'weekend') return 'Weekend';
  if (info.status === 'closure') return 'Break';
  return info.service?.shortLabel ?? 'Service';
}
