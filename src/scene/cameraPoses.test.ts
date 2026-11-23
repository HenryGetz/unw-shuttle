import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CAMERA_FOV, presetPose } from './cameraPoses';
import { STOPS, STOP_ORDER } from '../data/route';
import type { SceneCamera } from './contracts';

const VIEWPORTS: Array<[number, number]> = [
  [375, 460],
  [390, 460],
  [430, 520],
  [1440, 780],
];

function project(
  mode: Exclude<SceneCamera, 'follow'>,
  width: number,
  height: number,
  x: number,
  y: number,
  z: number,
): { x: number; y: number } {
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / height, 2, 20000);
  const pose = presetPose(mode, camera, width / height);
  camera.position.copy(pose.position);
  camera.lookAt(pose.target);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const point = new THREE.Vector3(x, y, z).project(camera);
  return { x: (point.x * 0.5 + 0.5) * width, y: (-point.y * 0.5 + 0.5) * height };
}

describe('camera presets', () => {
  it.each(VIEWPORTS)('frames every campus stop at %ix%i', (width, height) => {
    for (const id of STOP_ORDER.filter((stop) => stop !== 'rosedale')) {
      const point = project('campus', width, height, STOPS[id].x, 20, STOPS[id].z);
      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(width);
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(height);
    }
  });

  it.each(VIEWPORTS)('frames the whole loop including Rosedale at %ix%i', (width, height) => {
    for (const id of STOP_ORDER) {
      const point = project('route', width, height, STOPS[id].x, 20, STOPS[id].z);
      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(width);
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(height);
    }
  });
});
