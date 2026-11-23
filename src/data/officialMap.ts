import type { StopId } from './types';

/**
 * Canonical metadata transcribed from the 2026 UNW Campus Map PDF
 * (docs/2026_CampusMap_BuildingLocation.pdf). The PDF is the source of the
 * building numbers, names, categories, and off-route landmarks. OSM geometry
 * remains the source of the actual footprints.
 */
export type OfficialCategory = 'academic' | 'residential' | 'athletic' | 'landmark' | 'context';

export interface OfficialPlace {
  id: string;
  number?: number;
  name: string;
  shortName: string;
  category: OfficialCategory;
  aliases: string[];
  stop?: StopId;
  /** Approximate world anchor for places without a named OSM footprint. */
  anchor?: { x: number; z: number };
}

export const OFFICIAL_PLACES: OfficialPlace[] = [
  {
    id: 'island-chapel',
    number: 1,
    name: 'Island Chapel',
    shortName: 'Island Chapel',
    category: 'landmark',
    aliases: ['island chapel'],
    anchor: { x: -235, z: -805 },
  },
  {
    id: 'island-bridge',
    number: 2,
    name: 'Island Bridge',
    shortName: 'Island Bridge',
    category: 'landmark',
    aliases: ['island bridge'],
    anchor: { x: -205, z: -755 },
  },
  {
    id: 'powerhouse',
    number: 3,
    name: 'Powerhouse',
    shortName: 'Powerhouse',
    category: 'academic',
    aliases: ['powerhouse'],
    anchor: { x: -245, z: -585 },
  },
  {
    id: 'nazareth-hall',
    number: 4,
    name: 'Nazareth Hall',
    shortName: 'Nazareth Hall',
    category: 'residential',
    aliases: ['nazareth hall'],
  },
  {
    id: 'nazareth-chapel',
    number: 5,
    name: 'Nazareth Chapel & Nazareth Great Room',
    shortName: 'Nazareth Chapel',
    category: 'landmark',
    aliases: ['nazareth chapel', 'nazareth chapel & nazareth great room'],
    anchor: { x: -102, z: -570 },
  },
  {
    id: 'totino',
    number: 6,
    name: 'Totino Fine Arts Center',
    shortName: 'Totino Fine Arts',
    category: 'academic',
    aliases: ['totino fine arts center', 'totino', 'beverly & john lord knight performance hall'],
    stop: 'brc-totino',
  },
  {
    id: 'billy-graham',
    number: 7,
    name: 'Billy Graham Community Life Commons',
    shortName: 'Billy Graham Commons',
    category: 'academic',
    aliases: ['billy graham commons', 'billy graham community life commons'],
    stop: 'graham',
  },
  {
    id: 'berntsen',
    number: 8,
    name: 'Berntsen Library',
    shortName: 'Berntsen Library',
    category: 'academic',
    aliases: ['bernsten library', 'berntsen library'],
  },
  {
    id: 'riley',
    number: 9,
    name: 'Riley Hall',
    shortName: 'Riley Hall',
    category: 'residential',
    aliases: ['riley hall'],
  },
  {
    id: 'moyer',
    number: 10,
    name: 'Moyer Hall',
    shortName: 'Moyer Hall',
    category: 'residential',
    aliases: ['moyer hall'],
  },
  {
    id: 'ericksen',
    number: 11,
    name: 'Ericksen Center',
    shortName: 'Ericksen Center',
    category: 'athletic',
    aliases: ['ericksen center'],
    stop: 'erickson',
  },
  {
    id: 'hartill',
    number: 12,
    name: 'Hartill Hall',
    shortName: 'Hartill Hall',
    category: 'residential',
    aliases: ['hartill hall'],
    anchor: { x: -158, z: 206 },
  },
  {
    id: 'knuha',
    number: 13,
    name: 'KnuHa Residence',
    shortName: 'KnuHa',
    category: 'residential',
    aliases: ['knuha residence', 'knuha'],
    anchor: { x: -126, z: 138 },
  },
  {
    id: 'robertson',
    number: 13,
    name: 'Robertson Student Center',
    shortName: 'Robertson Center',
    category: 'academic',
    aliases: ['robertson student center'],
  },
  {
    id: 'knutson',
    number: 14,
    name: 'Knutson Hall',
    shortName: 'Knutson Hall',
    category: 'residential',
    aliases: ['knutson hall'],
    anchor: { x: -98, z: 70 },
  },
  {
    id: 'reynolds',
    number: 15,
    name: 'Reynolds Field Complex',
    shortName: 'Reynolds Field',
    category: 'athletic',
    aliases: ['reynolds field complex', 'reynolds field'],
    anchor: { x: -330, z: 155 },
  },
  {
    id: 'security',
    number: 16,
    name: 'Security Checkpoint',
    shortName: 'Security Checkpoint',
    category: 'context',
    aliases: ['security checkpoint'],
    anchor: { x: -95, z: 408 },
  },
  {
    id: 'ramseyer',
    number: 17,
    name: 'Ramseyer Hall',
    shortName: 'Ramseyer Hall',
    category: 'residential',
    aliases: ['ramseyer hall'],
    stop: 'ramseyer',
  },
  {
    id: 'mjmc',
    number: 18,
    name: 'Mel Johnson Media Center (KTIS)',
    shortName: 'MJMC / KTIS',
    category: 'academic',
    aliases: ['mel johnson media center', 'mel johnson media center (ktis)', 'mjmc'],
    stop: 'ramseyer',
  },
  {
    id: 'akenson',
    number: 19,
    name: 'Akenson Hall',
    shortName: 'Akenson Hall',
    category: 'residential',
    aliases: ['akenson hall'],
    stop: 'akenson',
  },
  {
    id: 'wilson',
    number: 20,
    name: 'Wilson Center',
    shortName: 'Wilson Center',
    category: 'academic',
    aliases: ['wilson center'],
    anchor: { x: -110, z: 795 },
  },
  {
    id: 'rosedale',
    number: 21,
    name: 'Rosedale Square North',
    shortName: 'Rosedale Square',
    category: 'residential',
    aliases: ['rosedale square north', 'rosedale square'],
    stop: 'rosedale',
    anchor: { x: -175.7, z: 1254.1 },
  },
];

export const PLACE_BY_ID = new Map(OFFICIAL_PLACES.map((place) => [place.id, place]));

const normalize = (value: string): string =>
  value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const PLACE_BY_ALIAS = new Map(
  OFFICIAL_PLACES.flatMap((place) =>
    [place.name, place.shortName, ...place.aliases].map((alias) => [normalize(alias), place] as const),
  ),
);

export function officialPlaceForBuilding(name: string | null): OfficialPlace | null {
  if (!name) return null;
  return PLACE_BY_ALIAS.get(normalize(name)) ?? null;
}

export function categoryForBuildingName(name: string | null): OfficialCategory {
  return officialPlaceForBuilding(name)?.category ?? 'context';
}

export const OFFICIAL_CATEGORY_LABEL: Record<OfficialCategory, string> = {
  academic: 'Academic / admin',
  residential: 'Housing / residential',
  athletic: 'Athletic fields',
  landmark: 'Landmark',
  context: 'Campus context',
};
