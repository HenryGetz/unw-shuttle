import { useEffect, useLayoutEffect, useMemo, useRef, type ComponentRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { MapViewMode } from '../lib/prefs';
import { createPose, followPose, overviewPose, type CameraPose } from './cameraPoses';
import type { SceneCamera } from './contracts';
import type { BusAnchor } from './palette';

interface CameraRigProps {
  anchor: BusAnchor;
  viewMode: MapViewMode;
  mode: SceneCamera;
  resetToken: number;
}

export function CameraRig({ anchor, viewMode, mode, resetToken }: CameraRigProps) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const resetting = useRef(true);
  const lastAnchor = useRef({ x: anchor.x, z: anchor.z });
  const latestAnchor = useRef(anchor);
  latestAnchor.current = anchor;
  const handledReset = useRef(resetToken);
  const lastViewMode = useRef<MapViewMode | null>(null);
  const scratchPose = useRef<CameraPose>(createPose());

  const aspect = size.width > 0 && size.height > 0 ? size.width / size.height : 1;

  const staticPose = useMemo(
    () => (mode === 'follow' ? null : overviewPose(viewMode, camera, aspect)),
    [aspect, camera, mode, viewMode],
  );

  // Swapping camera.up changes what "down" means to the orbit controls, so a
  // view-mode switch has to snap in the same commit. Damping through the swap
  // would roll the scene, and coming back to 3D from a straight-overhead pose
  // can hit a degenerate lookAt.
  useLayoutEffect(() => {
    const changed = lastViewMode.current !== viewMode;
    lastViewMode.current = viewMode;
    if (viewMode === '2d') camera.up.set(0, 0, -1);
    else camera.up.set(0, 1, 0);

    resetting.current = true;
    lastAnchor.current.x = latestAnchor.current.x;
    lastAnchor.current.z = latestAnchor.current.z;

    if (!changed) return;
    const pose =
      mode === 'follow'
        ? followPose(latestAnchor.current, viewMode, scratchPose.current)
        : staticPose;
    if (!pose) return;

    camera.position.copy(pose.position);
    const orbit = controls.current;
    if (orbit) {
      orbit.target.copy(pose.target);
      orbit.update();
    }
  }, [camera, mode, staticPose, viewMode]);

  useEffect(() => {
    if (handledReset.current === resetToken) return;
    handledReset.current = resetToken;
    resetting.current = true;
    lastAnchor.current.x = latestAnchor.current.x;
    lastAnchor.current.z = latestAnchor.current.z;
  }, [resetToken]);

  useFrame((_, delta) => {
    const orbit = controls.current;
    if (!orbit) return;
    const dt = Math.min(delta, 0.1);

    if (resetting.current) {
      const target =
        mode === 'follow' ? followPose(anchor, viewMode, scratchPose.current) : staticPose;
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
        lastAnchor.current.x = anchor.x;
        lastAnchor.current.z = anchor.z;
      }
      return;
    }

    if (mode !== 'follow') {
      lastAnchor.current.x = anchor.x;
      lastAnchor.current.z = anchor.z;
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
    lastAnchor.current.x = anchor.x;
    lastAnchor.current.z = anchor.z;
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enableRotate={viewMode !== '2d'}
      enablePan={mode !== 'follow'}
      panSpeed={0.85}
      minDistance={140}
      maxDistance={6400}
      minPolarAngle={viewMode === '2d' ? Math.PI / 2 : 0.14}
      maxPolarAngle={viewMode === '2d' ? Math.PI / 2 : 1.42}
      rotateSpeed={0.55}
      zoomSpeed={0.82}
      onStart={() => {
        resetting.current = false;
        lastAnchor.current.x = anchor.x;
        lastAnchor.current.z = anchor.z;
      }}
    />
  );
}
