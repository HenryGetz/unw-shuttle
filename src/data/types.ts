export type StopId =
  | 'ramseyer'
  | 'akenson'
  | 'rosedale'
  | 'lower-riley'
  | 'graham'
  | 'brc-totino'
  | 'erickson';

export type ServiceKind = 'mwf' | 'tr' | 'finals';

export type StopRole = 'time' | 'request' | 'drop-only' | 'pass';

export interface Trip {
  id: string;
  /** Minutes after midnight, campus time. Only stops the bus actually departs from have a value. */
  times: Partial<Record<StopId, number>>;
  /** Estimated drop-off arrival for a stop with no published departure time. */
  dropAt?: Partial<Record<StopId, number>>;
  requestOnly: StopId[];
  dropOnly: StopId[];
  note?: string;
}

export interface ServiceDay {
  kind: ServiceKind;
  label: string;
  shortLabel: string;
  trips: Trip[];
  note?: string;
}

export interface StopInfo {
  id: StopId;
  name: string;
  shortName: string;
  subtitle: string;
  x: number;
  z: number;
  primary?: boolean;
}

export interface RouteVariant {
  id: 'via' | 'bypass';
  points: [number, number][];
  length: number;
  stopAt: Partial<Record<StopId, number>>;
}

export interface CampusBuilding {
  name: string | null;
  kind: 'landmark' | 'academic' | 'residential' | 'athletic' | 'context';
  height: number;
  poly: [number, number][];
}

export interface CampusWater {
  name: string | null;
  poly: [number, number][];
  holes: [number, number][][];
}

export interface CampusRoad {
  name: string | null;
  kind: string;
  width: number;
  poly: [number, number][];
}

export interface CampusGeometry {
  origin: { lat: number; lon: number };
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  campus: [number, number][];
  buildings: CampusBuilding[];
  water: CampusWater[];
  roads: CampusRoad[];
}
