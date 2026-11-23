import type { CSSProperties } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { STOPS, STOP_ORDER } from '../data/route';
import type { StopId, StopInfo } from '../data/types';
import { PALETTE } from './palette';

const LABEL_LIFT: Record<StopId, number> = {
  ramseyer: 0,
  akenson: 0,
  rosedale: 0,
  'lower-riley': 26,
  graham: -18,
  'brc-totino': 12,
  erickson: 50,
};

interface StopMarkerProps {
  stop: StopInfo;
  active: boolean;
  onSelect: (stop: StopId) => void;
}

function StopMarker({ stop, active, onSelect }: StopMarkerProps) {
  const color = active ? PALETTE.stopSelected : PALETTE.stop;
  const radius = active ? 18 : 14;

  const labelStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 8px',
    borderRadius: 999,
    border: `1px solid ${active ? 'rgba(255,206,124,0.9)' : 'rgba(111,228,255,0.34)'}`,
    background: active ? 'rgba(38,24,6,0.88)' : 'rgba(4,10,19,0.8)',
    color: active ? '#ffe7ba' : '#d8f5ff',
    font: '600 10.5px/1.2 var(--font-sans, ui-sans-serif, system-ui, sans-serif)',
    letterSpacing: '0.045em',
    whiteSpace: 'nowrap',
    boxShadow: active
      ? '0 0 20px rgba(255,193,94,0.35)'
      : '0 4px 12px rgba(0,0,0,0.45)',
    cursor: 'pointer',
    userSelect: 'none',
    transform: `translateY(${LABEL_LIFT[stop.id]}px)`,
  };

  return (
    <group
      position={[stop.x, 0, stop.z]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect(stop.id);
      }}
    >
      <mesh position-y={0.62} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[radius - 1.4, radius, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 0.95 : 0.7}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh position-y={0.58} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[radius + 4.2, radius + 5.4, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 0.34 : 0.16}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {active ? (
        <mesh position-y={0.6} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[radius + 11, radius + 13, 64]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.24}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}

      <mesh position-y={20}>
        <cylinderGeometry args={[0.7, 1.5, 40, 8, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 0.55 : 0.3}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh position-y={40}>
        <octahedronGeometry args={[2.2, 0]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 1 : 0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh position-y={22}>
        <cylinderGeometry args={[22, 22, 48, 8, 1, true]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      <Html position={[0, 46, 0]} center zIndexRange={[8, 0]} pointerEvents="auto">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect(stop.id);
          }}
          onPointerDown={(event) => event.stopPropagation()}
          aria-pressed={active}
          title={`${stop.name} — ${stop.subtitle}`}
          style={labelStyle}
        >
          {stop.primary ? (
            <span
              aria-hidden
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: active ? PALETTE.stopSelected : PALETTE.stop,
                boxShadow: `0 0 8px ${active ? PALETTE.stopSelected : PALETTE.stop}`,
              }}
            />
          ) : null}
          {stop.shortName}
        </button>
      </Html>
    </group>
  );
}

interface StopMarkersProps {
  selectedStop: StopId | null;
  onSelectStop: (stop: StopId) => void;
}

export function StopMarkers({ selectedStop, onSelectStop }: StopMarkersProps) {
  return (
    <group>
      {STOP_ORDER.map((id) => (
        <StopMarker
          key={id}
          stop={STOPS[id]}
          active={selectedStop === id}
          onSelect={onSelectStop}
        />
      ))}
    </group>
  );
}
