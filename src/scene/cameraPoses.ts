import * as THREE from 'three';
import type { SceneCamera } from './contracts';
import { CAMPUS_VIEW, ROUTE_VIEW } from './geometry';
import type { BusAnchor } from './palette';

export const CAMERA_FOV = 44;

const CAMPUS_DIRECTION = new THREE.Vector3(0.4, 0.98, 1.32).normalize();
const ROUTE_DIRECTION = new THREE.Vector3(0.38, 1.02, 1.32).normalize();
const FOLLOW_OFFSET = new THREE.Vector3(150, 230, 300);
const FOLLOW_TARGET_HEIGHT = 2;

function fitDistance(radius: number, camera: THREE.PerspectiveCamera, aspect: number): number {
  const vertical = THREE.MathUtils.degToRad(camera.fov);
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * Math.max(0.32, aspect));
  const narrowest = Math.min(vertical, horizontal);
  return (radius / Math.sin(narrowest / 2)) * 1.02;
}

export function presetPose(
  mode: Exclude<SceneCamera, 'follow'>,
  camera: THREE.PerspectiveCamera,
  aspect: number,
): { position: THREE.Vector3; target: THREE.Vector3 } {
  const view = mode === 'campus' ? CAMPUS_VIEW : ROUTE_VIEW;
  const radius = mode === 'campus' ? view.radius * 0.78 : view.radius * 0.94;
  const direction = mode === 'campus' ? CAMPUS_DIRECTION : ROUTE_DIRECTION;
  const distance = fitDistance(radius, camera, aspect);
  const target = new THREE.Vector3(view.center[0], 0, view.center[2]);
  const position = target.clone().addScaledVector(direction, distance);
  return { position, target };
}

export function followPose(anchor: BusAnchor): {
  position: THREE.Vector3;
  target: THREE.Vector3;
} {
  const target = new THREE.Vector3(anchor.x, FOLLOW_TARGET_HEIGHT, anchor.z);
  return { position: target.clone().add(FOLLOW_OFFSET), target };
}
