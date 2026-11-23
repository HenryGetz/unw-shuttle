import type { OfficialCategory } from '../data/officialMap';
import type { CampusBuilding } from '../data/types';

export type BuildingKind = CampusBuilding['kind'];

export interface BusAnchor {
  x: number;
  z: number;
}

/**
 * Nocturnal architectural maquette. Colours come from the 2026 campus map's
 * categories, shifted darker and warmer for a night render; route gold is the
 * only saturated accent on the campus.
 */
export const PALETTE = {
  background: '#0a0713',
  fog: '#0f0a19',
  ground: '#0c0816',
  campus: '#1b1428',
  campusEdge: '#6b5a8e',
  boundary: '#6b5a8e',
  roadTrunk: '#7d7199',
  roadTertiary: '#6a5f88',
  roadResidential: '#504769',
  roadService: '#332d47',
  water: '#101a3d',
  waterDeep: '#0a1028',
  waterEdge: '#586394',
  route: '#f2b705',
  routeInactive: '#4a3d63',
  routeWarm: '#f5c024',
  stop: '#cabbea',
  stopCore: '#1a1230',
  stopSelected: '#f2b705',
  stopPinned: '#e6bf63',
  busBody: '#f2b705',
  busBodyDark: '#2a1b3d',
  busUpper: '#f6efe1',
  busGlass: '#151024',
  busWheel: '#0b0812',
  busHub: '#9c8bb4',
  busHeadlight: '#ffe9c4',
  busTaillight: '#df5f4e',
  busBeacon: '#ffd071',
  busInterior: '#4a3a2a',
  treeTrunk: '#2a211d',
  treeBranch: '#544a5c',
} as const;

export const BUILDING_COLORS: Record<BuildingKind, string> = {
  context: '#2b2140',
  residential: '#384a6d',
  academic: '#4a346c',
  athletic: '#3d5749',
  landmark: '#5c4338',
};

export const BUILDING_ROOFS: Record<BuildingKind, string> = {
  context: '#3c3054',
  residential: '#5d7096',
  academic: '#715a94',
  athletic: '#637d6d',
  landmark: '#8f6b52',
};

export const BUILDING_EMISSIVE: Record<BuildingKind, string> = {
  context: '#0d0918',
  residential: '#0d1324',
  academic: '#140d22',
  athletic: '#0a1410',
  landmark: '#2b1c14',
};

export const BUILDING_OUTLINE: Record<BuildingKind, string> = {
  context: '#6c5f90',
  residential: '#8da0c4',
  academic: '#b7a3dd',
  athletic: '#9ab7a2',
  landmark: '#e0b183',
};

export const CATEGORY_ACCENT: Record<OfficialCategory, string> = {
  academic: '#c8b7ec',
  residential: '#a9b8d8',
  athletic: '#b4c7ac',
  landmark: '#e0b183',
  context: '#9d92b4',
};

export const CATEGORY_PLINTH: Record<OfficialCategory, string> = {
  academic: '#4b3768',
  residential: '#34435f',
  athletic: '#3c5046',
  landmark: '#5d4237',
  context: '#2a223c',
};

export const TREE_SHADES = ['#2a3c33', '#30463b', '#24352e', '#354a3d'] as const;
export const CONIFER_CAP = '#465544';
