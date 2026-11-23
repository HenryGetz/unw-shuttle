import type { CampusBuilding } from '../data/types';

export type BuildingKind = CampusBuilding['kind'];

export interface BusAnchor {
  x: number;
  z: number;
}

export const PALETTE = {
  background: '#04070f',
  fog: '#060b17',
  ground: '#070d19',
  campus: '#0d1a2c',
  grid: '#1a3350',
  gridCenter: '#244566',
  boundary: '#3f7fa6',
  roadTrunk: '#8399ad',
  roadTertiary: '#5a7187',
  roadResidential: '#3a4e61',
  roadService: '#263646',
  water: '#0c2b47',
  waterEdge: '#3d7aa0',
  route: '#3fe7ff',
  routeDim: '#2f5165',
  stop: '#6fe4ff',
  stopSelected: '#ffce7c',
  busBody: '#cfe4f5',
  busBodyDark: '#22384c',
  busGlass: '#09141f',
  busWheel: '#080b11',
  busHub: '#6f818f',
  busHeadlight: '#ffe0a6',
  busTaillight: '#ff5a48',
  busBeacon: '#ffbe62',
} as const;

export const BUILDING_COLORS: Record<BuildingKind, string> = {
  context: '#223044',
  residential: '#5c5068',
  academic: '#45678a',
  athletic: '#3d6b5f',
  landmark: '#a08057',
};

export const BUILDING_EMISSIVE: Record<BuildingKind, string> = {
  context: '#050a12',
  residential: '#0d0914',
  academic: '#071321',
  athletic: '#04110e',
  landmark: '#3a2410',
};

export const TREE_SHADES = ['#20463d', '#275246', '#1a3a33', '#2b564a'] as const;
