import type { StopId } from '../data/types';
import type { BusState } from '../lib/schedule';

export type SceneCamera = 'follow' | 'campus' | 'route';

export interface CampusSceneProps {
  bus: BusState;
  billyStop: StopId;
  selectedStop: StopId | null;
  pinnedStops: StopId[];
  labelsVisible: boolean;
  camera: SceneCamera;
  resetToken: number;
  onSelectStop: (stop: StopId) => void;
  onCameraChange: (camera: SceneCamera) => void;
}

export const SCENE_CAMERA_LABEL: Record<SceneCamera, string> = {
  follow: 'Follow',
  campus: 'Campus',
  route: 'Route',
};

/**
 * The stop the live badge belongs to: the stop the bus is parked at, or the
 * stop it is heading for. The bus has no focus while off duty.
 */
export function busFocusStop(bus: BusState): StopId | null {
  if (bus.phase === 'off') return null;
  return bus.phase === 'parked' ? bus.prevStop : bus.nextStop;
}
