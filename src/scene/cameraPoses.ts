import * as THREE from 'three';
import { STOPS, STOP_ORDER } from '../data/route';
import type { MapViewMode } from '../lib/prefs';
import { CAMPUS_BOUNDARY, CAMPUS_VIEW } from './geometry';
import type { BusAnchor } from './palette';

export const CAMERA_FOV = 44;

const OVERVIEW_DIRECTION = new THREE.Vector3(0.4, 0.98, 1.32).normalize();
const FOLLOW_OFFSET = new THREE.Vector3(150, 230, 300);
const FOLLOW_TARGET_HEIGHT = 2;
/** Top-down tracking sits closer than the full-campus overview. */
const FOLLOW_2D_HEIGHT = 620;
const OVERVIEW_PADDING = 1.12;

export interface CameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export function createPose(): CameraPose {
  return { position: new THREE.Vector3(), target: new THREE.Vector3() };
}

/**
 * The 2D overview frames the whole campus plus the on-campus stops. Rosedale
 * is off campus by design, so it stays outside this frame and follow mode (or
 * the edge chip) takes the reader there.
 */
const OVERVIEW_2D_BOUNDS = (() => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  const include = (x: number, z: number) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  };

  for (const [x, , z] of CAMPUS_BOUNDARY) include(x, z);
  for (const id of STOP_ORDER) {
    if (id === 'rosedale') continue;
    include(STOPS[id].x, STOPS[id].z);
  }

  return {
    x: (minX + maxX) / 2,
    z: (minZ + maxZ) / 2,
    halfWidth: (maxX - minX) / 2,
    halfHeight: (maxZ - minZ) / 2,
  };
})();

function fitDistance(radius: number, camera: THREE.PerspectiveCamera, aspect: number): number {
  const vertical = THREE.MathUtils.degToRad(camera.fov);
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * Math.max(0.32, aspect));
  const narrowest = Math.min(vertical, horizontal);
  return (radius / Math.sin(narrowest / 2)) * 1.02;
}

/**
 * Overview framing. In 2D the camera sits straight overhead with screen-north
 * matching -Z; in 3D it keeps the isometric angle along the campus bounds.
 */
export function overviewPose(
  viewMode: MapViewMode,
  camera: THREE.PerspectiveCamera,
  aspect: number,
  pose: CameraPose = createPose(),
): CameraPose {
  if (viewMode === '2d') {
    const tanVertical = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const tanHorizontal = tanVertical * Math.max(0.32, aspect);
    const height = Math.max(
      (OVERVIEW_2D_BOUNDS.halfHeight * OVERVIEW_PADDING) / tanVertical,
      (OVERVIEW_2D_BOUNDS.halfWidth * OVERVIEW_PADDING) / tanHorizontal,
    );
    pose.position.set(OVERVIEW_2D_BOUNDS.x, height, OVERVIEW_2D_BOUNDS.z);
    pose.target.set(OVERVIEW_2D_BOUNDS.x, 0, OVERVIEW_2D_BOUNDS.z);
    return pose;
  }

  const distance = fitDistance(CAMPUS_VIEW.radius * 0.78, camera, aspect);
  pose.target.set(CAMPUS_VIEW.center[0], 0, CAMPUS_VIEW.center[2]);
  pose.position.copy(pose.target).addScaledVector(OVERVIEW_DIRECTION, distance);
  return pose;
}

/** Follow the smoothed bus anchor, top-down in 2D and oblique in 3D. */
export function followPose(
  anchor: BusAnchor,
  viewMode: MapViewMode,
  pose: CameraPose = createPose(),
): CameraPose {
  if (viewMode === '2d') {
    pose.position.set(anchor.x, FOLLOW_2D_HEIGHT, anchor.z);
    pose.target.set(anchor.x, 0, anchor.z);
    return pose;
  }

  pose.target.set(anchor.x, FOLLOW_TARGET_HEIGHT, anchor.z);
  pose.position.copy(pose.target).add(FOLLOW_OFFSET);
  return pose;
}
