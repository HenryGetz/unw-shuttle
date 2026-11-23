import { useMemo } from 'react';
import * as THREE from 'three';
import { STOPS, STOP_ORDER } from '../data/route';
import type { StopId, StopInfo } from '../data/types';
import { PALETTE } from './palette';

export const STOP_ANCHOR_HEIGHT = 28;

interface StopMarkerProps {
  stop: StopInfo;
  selected: boolean;
  pinned: boolean;
  hovered: boolean;
  onSelect: (stop: StopId) => void;
  onHover: (stop: StopId | null) => void;
}

/**
 * A route beacon, not a map pin: a thin stem and a small ring on the ground.
 * Its floating label is owned by SceneLabels; the invisible cylinder keeps the
 * tap target comfortably larger than the visible marker.
 */
function StopMarker({ stop, selected, pinned, hovered, onSelect, onHover }: StopMarkerProps) {
  const accent = selected || hovered ? PALETTE.stopSelected : pinned ? PALETTE.stopPinned : PALETTE.stop;
  const radius = selected ? 11 : hovered ? 10 : 8;
  const stemHeight = selected ? 24 : hovered ? 21 : 17;

  return (
    <group position={[stop.x, 0, stop.z]}>
      <mesh position-y={0.5} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[Math.max(2, radius - 1.4), radius, 36]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={selected ? 0.92 : pinned ? 0.62 : hovered ? 0.7 : 0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh position-y={0.5} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[radius * 0.4, 20]} />
        <meshBasicMaterial
          color={PALETTE.stopCore}
          transparent
          opacity={0.72}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {pinned && !selected ? (
        <mesh position-y={0.52} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[radius + 3.6, radius + 4.4, 36]} />
          <meshBasicMaterial
            color={PALETTE.stopPinned}
            transparent
            opacity={0.34}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}

      <mesh position-y={stemHeight / 2}>
        <cylinderGeometry args={[0.3, 0.7, stemHeight, 6, 1, true]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={selected ? 0.55 : 0.28}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh position-y={stemHeight + 1}>
        <octahedronGeometry args={[selected ? 1.9 : hovered ? 1.6 : 1.2, 0]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={selected ? 1 : 0.72}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh
        position-y={30}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect(stop.id);
        }}
        onPointerEnter={(event) => {
          event.stopPropagation();
          onHover(stop.id);
        }}
        onPointerLeave={() => onHover(null)}
      >
        <cylinderGeometry args={[40, 40, 70, 10, 1, true]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

interface StopMarkersProps {
  selectedStop: StopId | null;
  pinnedStops: StopId[];
  hoveredStop: StopId | null;
  onSelectStop: (stop: StopId) => void;
  onHoverStop: (stop: StopId | null) => void;
}

export function StopMarkers({
  selectedStop,
  pinnedStops,
  hoveredStop,
  onSelectStop,
  onHoverStop,
}: StopMarkersProps) {
  const pinned = useMemo(() => new Set(pinnedStops), [pinnedStops]);

  return (
    <group>
      {STOP_ORDER.map((id) => (
        <StopMarker
          key={id}
          stop={STOPS[id]}
          selected={selectedStop === id}
          pinned={pinned.has(id)}
          hovered={hoveredStop === id}
          onSelect={onSelectStop}
          onHover={onHoverStop}
        />
      ))}
    </group>
  );
}
