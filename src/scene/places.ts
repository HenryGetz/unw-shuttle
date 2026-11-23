import { CAMPUS } from '../data/campus';
import {
  OFFICIAL_PLACES,
  officialPlaceForBuilding,
  type OfficialCategory,
  type OfficialPlace,
} from '../data/officialMap';

export interface ScenePlace {
  id: string;
  number?: number;
  name: string;
  shortName: string;
  category: OfficialCategory;
  /** Label anchor, world metres. */
  x: number;
  z: number;
  /** Height the label floats at above the footprint. */
  y: number;
  /** OSM footprint when the place resolved to a building, otherwise a plinth. */
  source: 'osm' | 'anchor';
  buildingIndex?: number;
}

export interface PlinthPlacement {
  id: string;
  x: number;
  z: number;
  radius: number;
  category: OfficialCategory;
}

interface PolygonInfo {
  x: number;
  z: number;
  area: number;
}

function polygonInfo(poly: [number, number][]): PolygonInfo {
  let x = 0;
  let z = 0;
  let area = 0;
  for (let index = 0; index < poly.length; index += 1) {
    const [px, pz] = poly[index];
    x += px;
    z += pz;
    const [nx, nz] = poly[(index + 1) % poly.length];
    area += px * nz - nx * pz;
  }
  return { x: x / poly.length, z: z / poly.length, area: Math.abs(area) / 2 };
}

const SNAP_RADIUS = 45;
const SNAP_MAX_AREA = 5000;

const PLINTH_RADIUS: Record<OfficialCategory, number> = {
  academic: 15,
  residential: 17,
  athletic: 34,
  landmark: 14,
  context: 11,
};

function resolveOfficialPlacement(): {
  places: ScenePlace[];
  plinths: PlinthPlacement[];
  buildingCategory: Map<number, OfficialCategory>;
} {
  const infos = CAMPUS.buildings.map((building) => ({
    building,
    info: polygonInfo(building.poly),
  }));

  const places: ScenePlace[] = [];
  const buildingCategory = new Map<number, OfficialCategory>();
  const usedPlaceIds = new Set<string>();
  const usedBuildings = new Set<number>();

  infos.forEach(({ building, info }, index) => {
    if (!building.name) return;
    const official = officialPlaceForBuilding(building.name);
    if (!official) return;
    usedPlaceIds.add(official.id);
    usedBuildings.add(index);
    buildingCategory.set(index, official.category);
    places.push({
      id: official.id,
      number: official.number,
      name: official.name,
      shortName: official.shortName,
      category: official.category,
      x: info.x,
      z: info.z,
      y: building.height + 4,
      source: 'osm',
      buildingIndex: index,
    });
  });

  // Metadata anchors snap to the nearest unnamed OSM footprint when one is
  // close enough, so landmark labels sit on real geometry instead of invented
  // campus blocks. Everything else gets a deliberately schematic plinth.
  const pending = OFFICIAL_PLACES.filter(
    (place: OfficialPlace) => place.anchor && !usedPlaceIds.has(place.id),
  );
  const pairs: { place: OfficialPlace; index: number; distance: number }[] = [];
  pending.forEach((place) => {
    infos.forEach(({ building, info }, index) => {
      if (building.name || usedBuildings.has(index)) return;
      if (info.area > SNAP_MAX_AREA) return;
      const distance = Math.hypot(info.x - place.anchor!.x, info.z - place.anchor!.z);
      if (distance <= SNAP_RADIUS) pairs.push({ place, index, distance });
    });
  });
  pairs.sort((left, right) => left.distance - right.distance);

  const snapped = new Map<string, number>();
  for (const pair of pairs) {
    if (usedPlaceIds.has(pair.place.id) || usedBuildings.has(pair.index)) continue;
    usedPlaceIds.add(pair.place.id);
    usedBuildings.add(pair.index);
    snapped.set(pair.place.id, pair.index);
    buildingCategory.set(pair.index, pair.place.category);
    const { info } = infos[pair.index];
    places.push({
      id: pair.place.id,
      number: pair.place.number,
      name: pair.place.name,
      shortName: pair.place.shortName,
      category: pair.place.category,
      x: info.x,
      z: info.z,
      y: infos[pair.index].building.height + 4,
      source: 'osm',
      buildingIndex: pair.index,
    });
  }

  const plinths: PlinthPlacement[] = [];
  pending.forEach((place) => {
    if (usedPlaceIds.has(place.id) || !place.anchor) return;
    places.push({
      id: place.id,
      number: place.number,
      name: place.name,
      shortName: place.shortName,
      category: place.category,
      x: place.anchor.x,
      z: place.anchor.z,
      y: 5.2,
      source: 'anchor',
    });
    plinths.push({
      id: place.id,
      x: place.anchor.x,
      z: place.anchor.z,
      radius: PLINTH_RADIUS[place.category],
      category: place.category,
    });
  });

  places.sort((left, right) => (left.number ?? 99) - (right.number ?? 99) || left.name.localeCompare(right.name));

  return { places, plinths, buildingCategory };
}

const resolved = resolveOfficialPlacement();

export const SCENE_PLACES: ScenePlace[] = resolved.places;
export const SCENE_PLINTHS: PlinthPlacement[] = resolved.plinths;
export const BUILDING_CATEGORY: Map<number, OfficialCategory> = resolved.buildingCategory;

/** Places that are useful on a cramped phone label layer. */
export const LANDMARK_PLACE_IDS = new Set(
  SCENE_PLACES.filter((place) => place.category === 'landmark').map((place) => place.id),
);
