import { useEffect, useMemo, useRef, type ComponentRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { followPose, presetPose } from './cameraPoses';
import type { SceneCamera } from './contracts';
import type { BusAnchor } from './palette';

interface CameraRigProps {
  anchor: BusAnchor;
  mode: SceneCamera;
  resetToken: number;
}

export function CameraRig({ anchor, mode, resetToken }: CameraRigProps) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const resetting = useRef(true);
  const lastAnchor = useRef({ x: anchor.x, z: anchor.z });
  const latestAnchor = useRef(anchor);
  latestAnchor.current = anchor;
  const handledReset = useRef(resetToken);

  const aspect = size.width > 0 && size.height > 0 ? size.width / size.height : 1;

  const staticPose = useMemo(() => {
    if (mode === 'follow') return null;
    return presetPose(mode, camera, aspect);
  }, [aspect, camera, mode]);

  useEffect(() => {
    resetting.current = true;
    lastAnchor.current = { ...latestAnchor.current };
    // Recenter on a mode or viewport change, not on every bus update: follow
    // mode translates an orbit the user has already adjusted.
  }, [mode, staticPose]);

  useEffect(() => {
    if (handledReset.current === resetToken) return;
    handledReset.current = resetToken;
    resetting.current = true;
    lastAnchor.current = { x: anchor.x, z: anchor.z };
  }, [anchor, mode, resetToken, staticPose]);

  useFrame((_, delta) => {
    const orbit = controls.current;
    if (!orbit) return;
    const dt = Math.min(delta, 0.1);

    if (resetting.current) {
      const target = mode === 'follow' ? followPose(anchor) : staticPose;
      if (!target) {
        resetting.current = false;
        return;
      }
      camera.position.set(
        THREE.MathUtils.damp(camera.position.x, target.position.x, 3.2, dt),
        THREE.MathUtils.damp(camera.position.y, target.position.y, 3.2, dt),
        THREE.MathUtils.damp(camera.position.z, target.position.z, 3.2, dt),
      );
      orbit.target.set(
        THREE.MathUtils.damp(orbit.target.x, target.target.x, 3.4, dt),
        THREE.MathUtils.damp(orbit.target.y, target.target.y, 3.4, dt),
        THREE.MathUtils.damp(orbit.target.z, target.target.z, 3.4, dt),
      );
      orbit.update();

      const distance =
        camera.position.distanceToSquared(target.position) +
        orbit.target.distanceToSquared(target.target);
      if (distance < 32) {
        resetting.current = false;
        lastAnchor.current = { x: anchor.x, z: anchor.z };
      }
      return;
    }

    if (mode !== 'follow') {
      lastAnchor.current = { x: anchor.x, z: anchor.z };
      return;
    }

    // Translate the whole orbit rig with the bus so manual rotate/zoom/pan
    // survives tracking instead of being fought by a recentering target.
    const dx = anchor.x - lastAnchor.current.x;
    const dz = anchor.z - lastAnchor.current.z;
    if (dx !== 0 || dz !== 0) {
      camera.position.x += dx;
      camera.position.z += dz;
      orbit.target.x += dx;
      orbit.target.z += dz;
      orbit.update();
    }
    lastAnchor.current = { x: anchor.x, z: anchor.z };
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan={mode !== 'follow'}
      panSpeed={0.85}
      minDistance={140}
      maxDistance={6400}
      minPolarAngle={0.14}
      maxPolarAngle={1.42}
      rotateSpeed={0.55}
      zoomSpeed={0.82}
      onStart={() => {
        resetting.current = false;
        lastAnchor.current = { x: anchor.x, z: anchor.z };
      }}
    />
  );
}
