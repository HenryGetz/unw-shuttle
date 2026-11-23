import { useLayoutEffect, useMemo, useRef } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { ROUTE_BYPASS, ROUTE_VIA } from '../data/route';
import type { RouteVariant } from '../data/types';
import { ROUTE_LINES, routeDirections } from './geometry';
import { PALETTE } from './palette';

interface DirectionMarkersProps {
  route: RouteVariant;
}

function DirectionMarkers({ route }: DirectionMarkersProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const markers = useMemo(() => routeDirections(route), [route]);

  useLayoutEffect(() => {
    if (!mesh.current || markers.length === 0) return;
    const helper = new THREE.Object3D();
    for (let index = 0; index < markers.length; index += 1) {
      const marker = markers[index];
      helper.position.set(marker.x, 1.9, marker.z);
      helper.rotation.set(Math.PI / 2, marker.heading, 0, 'YXZ');
      helper.scale.setScalar(1.5);
      helper.updateMatrix();
      mesh.current.setMatrixAt(index, helper.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [markers]);

  if (markers.length === 0) return null;

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, markers.length]}>
      <coneGeometry args={[1.05, 3.6, 4]} />
      <meshBasicMaterial
        color={PALETTE.route}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

interface RouteOverlayProps {
  activeRoute: RouteVariant['id'];
}

export function RouteOverlay({ activeRoute }: RouteOverlayProps) {
  const viaActive = activeRoute === 'via';
  const activePoints = viaActive ? ROUTE_LINES.via : ROUTE_LINES.bypass;
  const activeId = viaActive ? 'via' : 'bypass';

  return (
    <group>
      <Line
        points={ROUTE_LINES.via}
        color={viaActive ? PALETTE.route : PALETTE.routeDim}
        lineWidth={viaActive ? 4.2 : 2}
        dashed={!viaActive}
        dashSize={28}
        gapSize={18}
        transparent
        opacity={viaActive ? 0.96 : 0.5}
        depthWrite={false}
        toneMapped={false}
      />
      <Line
        points={ROUTE_LINES.bypass}
        color={viaActive ? PALETTE.routeDim : PALETTE.route}
        lineWidth={viaActive ? 2 : 4.2}
        dashed={viaActive}
        dashSize={28}
        gapSize={18}
        transparent
        opacity={viaActive ? 0.5 : 0.96}
        depthWrite={false}
        toneMapped={false}
      />

      <Line
        key={`glow-${activeId}`}
        points={activePoints}
        color={PALETTE.route}
        lineWidth={14}
        transparent
        opacity={0.14}
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />

      <DirectionMarkers key={`arrows-${activeId}`} route={viaActive ? ROUTE_VIA : ROUTE_BYPASS} />
    </group>
  );
}
