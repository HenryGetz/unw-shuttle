import * as THREE from 'three';
import { CAMPUS } from '../data/campus';
import { ROUTE_BYPASS, ROUTE_VIA, STOPS, STOP_ORDER } from '../data/route';
import type { CampusBuilding, RouteVariant } from '../data/types';
import { pointAtDistance } from '../lib/schedule';
import { BUILDING_COLORS, PALETTE, type BuildingKind } from './palette';

const BUILDING_KINDS: BuildingKind[] = ['context', 'residential', 'academic', 'athletic', 'landmark'];

interface ShapeBucket {
  positions: number[];
  normals: number[];
  colors: number[];
}

export interface BuildingMeshGeometry {
  kind: BuildingKind;
  geometry: THREE.BufferGeometry;
}

export interface BuildingGeometrySet {
  meshes: BuildingMeshGeometry[];
  outlines: THREE.BufferGeometry | null;
}

export interface WaterGeometry {
  name: string | null;
  geometry: THREE.BufferGeometry;
}

export interface TreePlacement {
  x: number;
  z: number;
  scale: number;
  rotation: number;
  variant: number;
}

export interface TreeSet {
  conifers: TreePlacement[];
  bare: TreePlacement[];
}

export interface RouteDirection {
  x: number;
  z: number;
  heading: number;
}

/**
 * Campus data is [x, z] in local meters (+X east, +Z south). Shape space uses
 * y = -z, and rotateX(-PI/2) turns that extrusion into +Y with world z intact.
 */
function polygonShape(poly: [number, number][]): THREE.Shape {
  const shape = new THREE.Shape();
  poly.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  shape.closePath();
  return shape;
}

function polygonArea(poly: [number, number][]): number {
  let area = 0;
  for (let index = 0; index < poly.length; index += 1) {
    const [x1, z1] = poly[index];
    const [x2, z2] = poly[(index + 1) % poly.length];
    area += x1 * z2 - x2 * z1;
  }
  return Math.abs(area) / 2;
}

function hashUnit(value: number): number {
  const raw = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

function pushAttribute(target: number[], source: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): void {
  const values = source.array;
  for (let index = 0; index < values.length; index += 1) {
    target.push(values[index]);
  }
}

export function buildBuildingGeometries(): BuildingGeometrySet {
  const buckets = new Map<BuildingKind, ShapeBucket>();
  const outlinePositions: number[] = [];

  CAMPUS.buildings.forEach((building: CampusBuilding, buildingIndex: number) => {
    if (building.poly.length < 3 || polygonArea(building.poly) < 1) return;

    const geometry = new THREE.ExtrudeGeometry(polygonShape(building.poly), {
      depth: Math.max(1, building.height),
      bevelEnabled: false,
      curveSegments: 1,
      steps: 1,
    });
    geometry.rotateX(-Math.PI / 2);

    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    if (!position || !normal) {
      geometry.dispose();
      return;
    }

    let bucket = buckets.get(building.kind);
    if (!bucket) {
      bucket = { positions: [], normals: [], colors: [] };
      buckets.set(building.kind, bucket);
    }

    pushAttribute(bucket.positions, position);
    pushAttribute(bucket.normals, normal);

    const jitter = 0.84 + hashUnit(buildingIndex + 1) * 0.3;
    const color = new THREE.Color(BUILDING_COLORS[building.kind]).multiplyScalar(jitter);
    const roof = color.clone().lerp(new THREE.Color('#c3d6e6'), 0.34);
    const vertexCount = position.count;
    for (let vertex = 0; vertex < vertexCount; vertex += 1) {
      const face = normal.getY(vertex) > 0.5 ? roof : color;
      bucket.colors.push(face.r, face.g, face.b);
    }

    if (building.name) {
      const edges = new THREE.EdgesGeometry(geometry, 24);
      const edgePosition = edges.getAttribute('position');
      if (edgePosition) pushAttribute(outlinePositions, edgePosition);
      edges.dispose();
    }

    geometry.dispose();
  });

  const meshes: BuildingMeshGeometry[] = [];
  for (const kind of BUILDING_KINDS) {
    const bucket = buckets.get(kind);
    if (!bucket || bucket.positions.length === 0) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(bucket.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(bucket.normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(bucket.colors, 3));
    geometry.computeBoundingSphere();
    meshes.push({ kind, geometry });
  }

  let outlines: THREE.BufferGeometry | null = null;
  if (outlinePositions.length > 0) {
    outlines = new THREE.BufferGeometry();
    outlines.setAttribute('position', new THREE.Float32BufferAttribute(outlinePositions, 3));
    outlines.computeBoundingSphere();
  }

  return { meshes, outlines };
}

export function buildCampusFillGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.ShapeGeometry(polygonShape(CAMPUS.campus), 1);
  geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingSphere();
  return geometry;
}

export function buildWaterGeometries(): WaterGeometry[] {
  return CAMPUS.water
    .filter((body) => body.poly.length >= 3)
    .map((body) => {
      const shape = polygonShape(body.poly);
      for (const hole of body.holes) {
        if (hole.length < 3) continue;
        const path = new THREE.Path();
        hole.forEach(([x, z], index) => {
          if (index === 0) path.moveTo(x, -z);
          else path.lineTo(x, -z);
        });
        path.closePath();
        shape.holes.push(path);
      }
      const geometry = new THREE.ShapeGeometry(shape, 1);
      geometry.rotateX(-Math.PI / 2);
      geometry.computeBoundingSphere();
      return { name: body.name, geometry };
    });
}

export function buildWaterEdgeGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const y = 0.36;

  const pushLoop = (loop: [number, number][]): void => {
    for (let index = 0; index < loop.length; index += 1) {
      const [x1, z1] = loop[index];
      const [x2, z2] = loop[(index + 1) % loop.length];
      positions.push(x1, y, z1, x2, y, z2);
    }
  };

  for (const body of CAMPUS.water) {
    pushLoop(body.poly);
    for (const hole of body.holes) pushLoop(hole);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

function roadColor(kind: string): THREE.Color {
  switch (kind) {
    case 'trunk':
      return new THREE.Color(PALETTE.roadTrunk);
    case 'tertiary':
      return new THREE.Color(PALETTE.roadTertiary);
    case 'residential':
      return new THREE.Color(PALETTE.roadResidential);
    default:
      return new THREE.Color(PALETTE.roadService);
  }
}

export function buildRoadGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const y = 0.4;

  for (const road of CAMPUS.roads) {
    const color = roadColor(road.kind);
    for (let index = 1; index < road.poly.length; index += 1) {
      const [x1, z1] = road.poly[index - 1];
      const [x2, z2] = road.poly[index];
      positions.push(x1, y, z1, x2, y, z2);
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

function toRoutePoints(points: [number, number][]): [number, number, number][] {
  return points.map(([x, z]) => [x, 1.2, z] as [number, number, number]);
}

export const ROUTE_LINES: Record<RouteVariant['id'], [number, number, number][]> = {
  via: toRoutePoints(ROUTE_VIA.points),
  bypass: toRoutePoints(ROUTE_BYPASS.points),
};

const first = CAMPUS.campus[0];
export const CAMPUS_BOUNDARY: [number, number, number][] = first
  ? [
      ...CAMPUS.campus.map(([x, z]) => [x, 0.9, z] as [number, number, number]),
      [first[0], 0.9, first[1]],
    ]
  : [];

export function routeDirections(route: RouteVariant, spacing = 165): RouteDirection[] {
  const directions: RouteDirection[] = [];
  if (route.length <= 0) return directions;
  for (let distance = spacing * 0.55; distance < route.length; distance += spacing) {
    const point = pointAtDistance(route, distance);
    directions.push({ x: point.x, z: point.z, heading: point.heading });
  }
  return directions;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function segmentDistanceSq(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lengthSq)) : 0;
  const qx = ax + dx * t;
  const qz = az + dz * t;
  return (px - qx) * (px - qx) + (pz - qz) * (pz - qz);
}

function pointInPolygon(poly: [number, number][], x: number, z: number): boolean {
  let inside = false;
  for (let index = 0, previous = poly.length - 1; index < poly.length; previous = index, index += 1) {
    const [xi, zi] = poly[index];
    const [xj, zj] = poly[previous];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

interface Segment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  clearance: number;
}

function buildSegments(points: [number, number][], clearance: number): Segment[] {
  const segments: Segment[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const [ax, az] = points[index - 1];
    const [bx, bz] = points[index];
    segments.push({ ax, az, bx, bz, clearance });
  }
  return segments;
}

function blockedBySegments(segments: Segment[], x: number, z: number): boolean {
  return segments.some(
    (segment) =>
      segmentDistanceSq(x, z, segment.ax, segment.az, segment.bx, segment.bz) <
      segment.clearance * segment.clearance,
  );
}

function boundaryDistanceSq(segments: Segment[], x: number, z: number): number {
  let best = Infinity;
  for (const segment of segments) {
    const distance = segmentDistanceSq(x, z, segment.ax, segment.az, segment.bx, segment.bz);
    if (distance < best) best = distance;
  }
  return best;
}

export function buildTreePlacements(): TreeSet {
  const random = mulberry32(0x5eed1a7e);

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of CAMPUS.campus) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }

  const campusEdges: Segment[] = [];
  for (let index = 0; index < CAMPUS.campus.length; index += 1) {
    const [ax, az] = CAMPUS.campus[index];
    const [bx, bz] = CAMPUS.campus[(index + 1) % CAMPUS.campus.length];
    campusEdges.push({ ax, az, bx, bz, clearance: 0 });
  }

  const roadSegments = CAMPUS.roads.flatMap((road) =>
    buildSegments(road.poly, road.width / 2 + 5),
  );
  const routeSegments = [...buildSegments(ROUTE_VIA.points, 13), ...buildSegments(ROUTE_BYPASS.points, 13)];
  const buildingBoxes = CAMPUS.buildings.map((building) => {
    let bxMin = Infinity;
    let bxMax = -Infinity;
    let bzMin = Infinity;
    let bzMax = -Infinity;
    for (const [x, z] of building.poly) {
      bxMin = Math.min(bxMin, x);
      bxMax = Math.max(bxMax, x);
      bzMin = Math.min(bzMin, z);
      bzMax = Math.max(bzMax, z);
    }
    return { minX: bxMin - 5, maxX: bxMax + 5, minZ: bzMin - 5, maxZ: bzMax + 5 };
  });

  const waterBodies = CAMPUS.water.filter((body) => body.poly.length >= 3);
  const isWater = (x: number, z: number): boolean =>
    waterBodies.some((body) => {
      if (!pointInPolygon(body.poly, x, z)) return false;
      return !body.holes.some((hole) => pointInPolygon(hole, x, z));
    });

  const placements: TreePlacement[] = [];
  const stops = STOP_ORDER.map((id) => STOPS[id]);

  const place = (band: number, spacingSq: number): boolean => {
    const x = minX - band + random() * (maxX - minX + band * 2);
    const z = minZ - band + random() * (maxZ - minZ + band * 2);

    if (boundaryDistanceSq(campusEdges, x, z) > band * band) return false;
    if (isWater(x, z)) return false;
    if (blockedBySegments(roadSegments, x, z)) return false;
    if (blockedBySegments(routeSegments, x, z)) return false;
    if (buildingBoxes.some((box) => x > box.minX && x < box.maxX && z > box.minZ && z < box.maxZ)) {
      return false;
    }
    if (stops.some((stop) => (stop.x - x) ** 2 + (stop.z - z) ** 2 < 19 * 19)) return false;
    if (placements.some((tree) => (tree.x - x) ** 2 + (tree.z - z) ** 2 < spacingSq)) return false;

    placements.push({
      x,
      z,
      scale: 0.82 + random() * 0.55,
      rotation: random() * Math.PI * 2,
      variant: Math.floor(random() * 4),
    });
    return true;
  };

  for (let attempt = 0; attempt < 4200 && placements.length < 156; attempt += 1) {
    place(165, 11.5 * 11.5);
  }

  if (placements.length < 100) {
    for (let attempt = 0; attempt < 2600 && placements.length < 112; attempt += 1) {
      place(280, 8 * 8);
    }
  }

  const conifers: TreePlacement[] = [];
  const bare: TreePlacement[] = [];
  for (const tree of placements) {
    if (tree.variant === 3) bare.push(tree);
    else conifers.push(tree);
  }

  return { conifers, bare };
}
