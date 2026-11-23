import { useMemo } from 'react';
import * as THREE from 'three';
import { STOPS, STOP_ORDER } from '../data/route';
import type { StopId, StopInfo } from '../data/types';
import { PALETTE } from './palette';

export const STOP_ANCHOR_HEIGHT = 30;

interface StopMarkerProps {
  stop: StopInfo;
  active: boolean;
  pinned: boolean;
  onSelect: (stop: StopId) => void;
}

function StopMarker({ stop, active, pinned, onSelect }: StopMarkerProps) {
  const accent = active || pinned ? PALETTE.stopSelected : PALETTE.stop;
  const radius = active ? 18 : 15;
  const stemHeight = active ? 34 : 26;

  return (
    <group
      position={[stop.x, 0, stop.z]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect(stop.id);
      }}
    >
      <mesh position-y={0.6} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[radius - 1.6, radius, 40]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={active ? 0.94 : pinned ? 0.7 : 0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh position-y={0.6} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[radius * 0.42, 24]} />
        <meshBasicMaterial
          color={PALETTE.stopCore}
          transparent
          opacity={0.8}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {pinned && !active ? (
        <mesh position-y={0.62} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[radius + 4.4, radius + 5.6, 40]} />
          <meshBasicMaterial
            color={PALETTE.stopPinned}
            transparent
            opacity={0.42}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}

      <mesh position-y={stemHeight / 2}>
        <cylinderGeometry args={[0.42, 0.9, stemHeight, 6, 1, true]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={active ? 0.62 : 0.34}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh position-y={stemHeight + 1.5}>
        <octahedronGeometry args={[active ? 2.4 : 1.9, 0]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={active ? 1 : 0.8}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh position-y={24}>
        <cylinderGeometry args={[20, 20, 48, 8, 1, true]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

interface StopMarkersProps {
  selectedStop: StopId | null;
  pinnedStops: StopId[];
  onSelectStop: (stop: StopId) => void;
}

export function StopMarkers({ selectedStop, pinnedStops, onSelectStop }: StopMarkersProps) {
  const pinned = useMemo(() => new Set(pinnedStops), [pinnedStops]);

  return (
    <group>
      {STOP_ORDER.map((id) => (
        <StopMarker
          key={id}
          stop={STOPS[id]}
          active={selectedStop === id}
          pinned={pinned.has(id)}
          onSelect={onSelectStop}
        />
      ))}
    </group>
  );
}
