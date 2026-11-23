import type { StopId } from '../data/types';
import type { BusState } from '../lib/schedule';

export type SceneCamera = 'follow' | 'campus' | 'route';

export interface CampusSceneProps {
  bus: BusState;
  selectedStop: StopId | null;
  pinnedStops: StopId[];
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
