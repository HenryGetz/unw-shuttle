import { useEffect, useMemo, useRef, type ComponentRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { BusAnchor } from './palette';

export type CameraPresetId = 'campus' | 'whole';

interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
}

export const CAMERA_PRESETS: Record<CameraPresetId, CameraPose> = {
  campus: { position: [500, 820, 1350], target: [-110, 0, -20] },
  whole: { position: [900, 1600, 2900], target: [-120, 0, 300] },
};

export const DEFAULT_CAMERA_POSITION = CAMERA_PRESETS.campus.position;
export const DEFAULT_CAMERA_TARGET = CAMERA_PRESETS.campus.target;

interface CameraRigProps {
  anchor: BusAnchor;
  following: boolean;
  preset: CameraPresetId;
  viewKey: number;
}

export function CameraRig({ anchor, following, preset, viewKey }: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const resetting = useRef(false);
  const handledView = useRef(viewKey);

  const goal = useMemo(() => {
    const pose = CAMERA_PRESETS[preset];
    return {
      position: new THREE.Vector3(...pose.position),
      target: new THREE.Vector3(...pose.target),
    };
  }, [preset]);

  useEffect(() => {
    if (handledView.current === viewKey) return;
    handledView.current = viewKey;
    resetting.current = true;
  }, [viewKey]);

  useEffect(() => {
    if (following) resetting.current = false;
  }, [following]);

  useFrame((_, delta) => {
    const orbit = controls.current;
    if (!orbit) return;
    const dt = Math.min(delta, 0.1);

    if (resetting.current) {
      camera.position.set(
        THREE.MathUtils.damp(camera.position.x, goal.position.x, 3.4, dt),
        THREE.MathUtils.damp(camera.position.y, goal.position.y, 3.4, dt),
        THREE.MathUtils.damp(camera.position.z, goal.position.z, 3.4, dt),
      );
      orbit.target.set(
        THREE.MathUtils.damp(orbit.target.x, goal.target.x, 3.4, dt),
        THREE.MathUtils.damp(orbit.target.y, goal.target.y, 3.4, dt),
        THREE.MathUtils.damp(orbit.target.z, goal.target.z, 3.4, dt),
      );
      orbit.update();

      const dx = camera.position.x - goal.position.x;
      const dy = camera.position.y - goal.position.y;
      const dz = camera.position.z - goal.position.z;
      const tx = orbit.target.x - goal.target.x;
      const ty = orbit.target.y - goal.target.y;
      const tz = orbit.target.z - goal.target.z;
      if (dx * dx + dy * dy + dz * dz < 25 && tx * tx + ty * ty + tz * tz < 25) {
        resetting.current = false;
      }
      return;
    }

    if (!following) return;
    orbit.target.set(
      THREE.MathUtils.damp(orbit.target.x, anchor.x, 2.6, dt),
      THREE.MathUtils.damp(orbit.target.y, 2, 2.6, dt),
      THREE.MathUtils.damp(orbit.target.z, anchor.z, 2.6, dt),
    );
    orbit.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={DEFAULT_CAMERA_TARGET}
      enableDamping
      dampingFactor={0.075}
      enablePan={false}
      minDistance={220}
      maxDistance={4200}
      minPolarAngle={0.18}
      maxPolarAngle={1.36}
      rotateSpeed={0.6}
      zoomSpeed={0.85}
      onStart={() => {
        resetting.current = false;
      }}
    />
  );
}
