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
      helper.scale.setScalar(1.4);
      helper.updateMatrix();
      mesh.current.setMatrixAt(index, helper.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [markers]);

  if (markers.length === 0) return null;

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, markers.length]}>
      <coneGeometry args={[1.05, 3.4, 4]} />
      <meshBasicMaterial color={PALETTE.route} transparent opacity={0.55} depthWrite={false} toneMapped={false} />
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
        color={viaActive ? PALETTE.route : PALETTE.routeInactive}
        lineWidth={viaActive ? 5 : 2.2}
        dashed={!viaActive}
        dashSize={26}
        gapSize={20}
        transparent
        opacity={viaActive ? 0.94 : 0.52}
        depthWrite={false}
        toneMapped={false}
      />
      <Line
        points={ROUTE_LINES.bypass}
        color={viaActive ? PALETTE.routeInactive : PALETTE.route}
        lineWidth={viaActive ? 2.2 : 5}
        dashed={viaActive}
        dashSize={26}
        gapSize={20}
        transparent
        opacity={viaActive ? 0.52 : 0.94}
        depthWrite={false}
        toneMapped={false}
      />

      <Line
        key={`warm-${activeId}`}
        points={activePoints}
        color={PALETTE.routeWarm}
        lineWidth={11}
        transparent
        opacity={0.07}
        depthWrite={false}
        toneMapped={false}
      />

      <DirectionMarkers key={`arrows-${activeId}`} route={viaActive ? ROUTE_VIA : ROUTE_BYPASS} />
    </group>
  );
}
