import raw from './route.json';
import type { RouteVariant, StopId, StopInfo } from './types';

interface RawRoute {
  origin: { x: number; z: number };
  stops: Record<StopId, { x: number; z: number }>;
  variants: Record<'via' | 'bypass', { length: number; stopAt: Partial<Record<StopId, number>>; points: [number, number][] }>;
}

const route = raw as unknown as RawRoute;

export const ROUTE_VIA: RouteVariant = { id: 'via', ...route.variants.via };
export const ROUTE_BYPASS: RouteVariant = { id: 'bypass', ...route.variants.bypass };
export const STOP_POINTS = route.stops;

export const RAM_STOP: StopId = 'ramseyer';
export const BILLY_REGULAR_STOP: StopId = 'brc-totino';
export const BILLY_FINALS_STOP: StopId = 'graham';

export const STOP_ORDER: StopId[] = [
  'ramseyer',
  'akenson',
  'rosedale',
  'lower-riley',
  'graham',
  'brc-totino',
  'erickson',
];

const stop = (id: StopId, base: Omit<StopInfo, 'x' | 'z'>): StopInfo => ({
  ...base,
  x: STOP_POINTS[id].x,
  z: STOP_POINTS[id].z,
});

export const STOPS: Record<StopId, StopInfo> = {
  ramseyer: stop('ramseyer', {
    id: 'ramseyer',
    name: 'MJMC / Ramseyer Hall',
    shortName: 'RAM',
    subtitle: 'Mel Johnson Media Center · Ramseyer Hall',
    primary: true,
  }),
  akenson: stop('akenson', {
    id: 'akenson',
    name: 'Akenson Hall',
    shortName: 'Akenson',
    subtitle: 'South campus',
  }),
  rosedale: stop('rosedale', {
    id: 'rosedale',
    name: 'Rosedale Square',
    shortName: 'Rosedale',
    subtitle: 'Off-campus · request on certain trips',
  }),
  'lower-riley': stop('lower-riley', {
    id: 'lower-riley',
    name: 'Lower Riley Parking Lot',
    shortName: 'Lower Riley',
    subtitle: 'Riley Hall lot',
  }),
  graham: stop('graham', {
    id: 'graham',
    name: 'Graham Commons',
    shortName: 'The Billy',
    subtitle: 'Billy Graham Community Life Commons',
    primary: true,
  }),
  'brc-totino': stop('brc-totino', {
    id: 'brc-totino',
    name: 'Berntsen / Totino',
    shortName: 'BRC / Totino',
    subtitle: 'Berntsen Library · Totino Fine Arts',
    primary: true,
  }),
  erickson: stop('erickson', {
    id: 'erickson',
    name: 'Ericksen Center',
    shortName: 'Ericksen',
    subtitle: 'Request only · call 651-631-5310',
  }),
};
