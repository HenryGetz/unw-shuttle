import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CAMERA_FOV, followPose, overviewPose } from './cameraPoses';
import type { MapViewMode } from '../lib/prefs';
import { STOPS, STOP_ORDER } from '../data/route';

const VIEWPORTS: Array<[number, number]> = [
  [375, 460],
  [390, 460],
  [430, 520],
  [1440, 780],
];

const CAMPUS_STOPS = STOP_ORDER.filter((stop) => stop !== 'rosedale');

function frame(
  viewMode: MapViewMode,
  width: number,
  height: number,
): { camera: THREE.PerspectiveCamera; target: THREE.Vector3 } {
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / height, 2, 20000);
  if (viewMode === '2d') camera.up.set(0, 0, -1);
  const pose = overviewPose(viewMode, camera, width / height);
  camera.position.copy(pose.position);
  camera.lookAt(pose.target);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return { camera, target: pose.target };
}

function project(
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
  x: number,
  y: number,
  z: number,
): { x: number; y: number } {
  const point = new THREE.Vector3(x, y, z).project(camera);
  return { x: (point.x * 0.5 + 0.5) * width, y: (-point.y * 0.5 + 0.5) * height };
}

describe('overview framing', () => {
  it.each(VIEWPORTS)('frames every campus stop except Rosedale in 2D at %ix%i', (width, height) => {
    const { camera } = frame('2d', width, height);
    for (const id of CAMPUS_STOPS) {
      const point = project(camera, width, height, STOPS[id].x, 20, STOPS[id].z);
      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(width);
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(height);
    }
  });

  it.each(VIEWPORTS)('frames every campus stop except Rosedale in 3D at %ix%i', (width, height) => {
    const { camera } = frame('3d', width, height);
    for (const id of CAMPUS_STOPS) {
      const point = project(camera, width, height, STOPS[id].x, 20, STOPS[id].z);
      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(width);
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(height);
    }
  });

  it('is straight overhead with north up and east right in 2D', () => {
    const width = 390;
    const height = 460;
    const { camera, target } = frame('2d', width, height);

    expect(camera.position.x).toBeCloseTo(target.x, 6);
    expect(camera.position.z).toBeCloseTo(target.z, 6);
    expect(camera.position.y).toBeGreaterThan(0);

    const north = project(camera, width, height, target.x, 0, target.z - 120);
    const south = project(camera, width, height, target.x, 0, target.z + 120);
    const east = project(camera, width, height, target.x + 120, 0, target.z);
    const west = project(camera, width, height, target.x - 120, 0, target.z);

    expect(north.y).toBeLessThan(south.y);
    expect(north.x).toBeCloseTo(south.x, 6);
    expect(east.x).toBeGreaterThan(west.x);
  });

  it('keeps the 3D overview oblique above the campus', () => {
    const { camera, target } = frame('3d', 1440, 780);
    expect(camera.position.y).toBeGreaterThan(600);
    expect(camera.position.z).toBeGreaterThan(target.z);
    expect(camera.position.x).toBeGreaterThan(target.x);
  });
});

describe('follow framing', () => {
  it('tracks the bus from straight overhead in 2D', () => {
    const anchor = { x: 42, z: -310 };
    const pose = followPose(anchor, '2d');
    expect(pose.position.x).toBeCloseTo(anchor.x, 6);
    expect(pose.position.z).toBeCloseTo(anchor.z, 6);
    expect(pose.position.y).toBeGreaterThan(300);
    expect(pose.target.x).toBeCloseTo(anchor.x, 6);
    expect(pose.target.z).toBeCloseTo(anchor.z, 6);
    expect(pose.target.y).toBe(0);
  });

  it('keeps its offset from the bus in 3D', () => {
    const anchor = { x: 42, z: -310 };
    const pose = followPose(anchor, '3d');
    expect(pose.target.x).toBeCloseTo(anchor.x, 6);
    expect(pose.target.z).toBeCloseTo(anchor.z, 6);
    expect(pose.position.x - pose.target.x).toBeCloseTo(150, 6);
    expect(pose.position.y - pose.target.y).toBeCloseTo(230, 6);
    expect(pose.position.z - pose.target.z).toBeCloseTo(300, 6);
  });
});
