import { useEffect, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { BusState } from '../lib/schedule';
import { STOPS, STOP_ORDER } from '../data/route';
import { PALETTE, type BusAnchor } from './palette';

interface ShuttleBusProps {
  bus: BusState;
  anchor: BusAnchor;
  reducedMotion: boolean;
}

export function ShuttleBus({ bus, anchor, reducedMotion }: ShuttleBusProps) {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const haloMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const beaconMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const beamMaterial = useRef<THREE.MeshBasicMaterial>(null);

  const target = useRef({
    x: bus.position.x,
    z: bus.position.z,
    heading: bus.heading,
    visible: bus.phase !== 'off',
  });
  const smooth = useRef({
    x: bus.position.x,
    z: bus.position.z,
    heading: bus.heading,
  });
  const atStop = STOP_ORDER.some(
    (id) => Math.hypot(bus.position.x - STOPS[id].x, bus.position.z - STOPS[id].z) < 34,
  );

  useEffect(() => {
    target.current.x = bus.position.x;
    target.current.z = bus.position.z;
    target.current.heading = bus.heading;
    target.current.visible = bus.phase !== 'off';
  }, [bus.position.x, bus.position.z, bus.heading, bus.phase]);

  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;

    const dt = Math.min(delta, 0.1);
    const next = target.current;
    const current = smooth.current;

    current.x = THREE.MathUtils.damp(current.x, next.x, 4.2, dt);
    current.z = THREE.MathUtils.damp(current.z, next.z, 4.2, dt);
    const turn = THREE.MathUtils.euclideanModulo(next.heading - current.heading + Math.PI, Math.PI * 2) - Math.PI;
    current.heading = THREE.MathUtils.euclideanModulo(
      current.heading + THREE.MathUtils.damp(0, turn, 6.5, dt) + Math.PI,
      Math.PI * 2,
    ) - Math.PI;

    node.position.set(current.x, 0, current.z);
    node.rotation.y = current.heading;
    node.visible = next.visible;

    anchor.x = current.x;
    anchor.z = current.z;

    if (!next.visible) return;

    const pulse = reducedMotion ? 0.5 : 0.5 + Math.sin(state.clock.elapsedTime * 2.3) * 0.5;
    if (halo.current) halo.current.scale.setScalar(1 + pulse * 0.85);
    if (haloMaterial.current) haloMaterial.current.opacity = reducedMotion ? 0.32 : 0.46 - pulse * 0.22;
    if (beaconMaterial.current) beaconMaterial.current.opacity = reducedMotion ? 0.92 : 0.6 + pulse * 0.4;
    if (beamMaterial.current) beamMaterial.current.opacity = reducedMotion ? 0.22 : 0.18 + pulse * 0.12;
  });

  return (
    <group ref={group} position={[bus.position.x, 0, bus.position.z]} rotation-y={bus.heading}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.06} scale={[2.2, 3.3, 1]} renderOrder={0}>
        <circleGeometry args={[4.6, 28]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.07} scale={[1.7, 2.7, 1]} renderOrder={1}>
        <circleGeometry args={[4.6, 28]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.08} scale={[1.25, 2.05, 1]} renderOrder={2}>
        <circleGeometry args={[4.6, 28]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.4} depthWrite={false} />
      </mesh>

      <mesh position-y={0.9}>
        <boxGeometry args={[2.45, 0.8, 8.2]} />
        <meshStandardMaterial color={PALETTE.busBodyDark} roughness={0.6} metalness={0.25} />
      </mesh>
      <mesh position-y={2.15}>
        <boxGeometry args={[2.55, 1.7, 8.3]} />
        <meshStandardMaterial color={PALETTE.busBody} roughness={0.52} metalness={0.22} />
      </mesh>
      <mesh position-y={3.1}>
        <boxGeometry args={[2.35, 0.25, 7.9]} />
        <meshStandardMaterial color={PALETTE.busBodyDark} roughness={0.6} metalness={0.2} />
      </mesh>

      <mesh position={[0, 2.48, 0.1]}>
        <boxGeometry args={[2.6, 0.8, 5.9]} />
        <meshStandardMaterial
          color={PALETTE.busGlass}
          roughness={0.15}
          metalness={0.45}
          emissive="#0a1a26"
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh position={[0, 2.38, 4.17]}>
        <boxGeometry args={[2.25, 0.95, 0.1]} />
        <meshStandardMaterial color={PALETTE.busGlass} roughness={0.12} metalness={0.5} />
      </mesh>
      <mesh position={[0, 2.42, -4.17]}>
        <boxGeometry args={[2.15, 0.78, 0.1]} />
        <meshStandardMaterial color={PALETTE.busGlass} roughness={0.16} metalness={0.45} />
      </mesh>

      <mesh position={[0, 1.5, 4.2]}>
        <boxGeometry args={[1.7, 0.3, 0.06]} />
        <meshBasicMaterial color={PALETTE.route} toneMapped={false} />
      </mesh>

      <mesh position={[0, 0.78, 4.02]}>
        <boxGeometry args={[2.6, 0.32, 0.28]} />
        <meshStandardMaterial color={PALETTE.busBodyDark} roughness={0.7} />
      </mesh>

      {[-0.85, 0.85].map((x) => (
        <mesh key={`head-${x}`} position={[x, 1.42, 4.2]}>
          <sphereGeometry args={[0.2, 10, 8]} />
          <meshBasicMaterial color={PALETTE.busHeadlight} toneMapped={false} />
        </mesh>
      ))}

      {[-0.85, 0.85].map((x) => (
        <mesh
          key={`beam-${x}`}
          position={[x, 1.38, 8.2]}
          rotation-x={-Math.PI / 2}
        >
          <coneGeometry args={[1.5, 8, 12, 1, true]} />
          <meshBasicMaterial
            color={PALETTE.busHeadlight}
            transparent
            opacity={0.09}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}

      {[-0.95, 0.95].map((x) => (
        <mesh key={`tail-${x}`} position={[x, 1.48, -4.2]}>
          <boxGeometry args={[0.42, 0.22, 0.06]} />
          <meshBasicMaterial color={PALETTE.busTaillight} toneMapped={false} />
        </mesh>
      ))}

      {[-1.285, 1.285].map((x) => (
        <mesh key={`stripe-${x}`} position={[x, 1.55, 0]}>
          <boxGeometry args={[0.04, 0.12, 7.4]} />
          <meshBasicMaterial color={PALETTE.route} toneMapped={false} />
        </mesh>
      ))}

      {[
        [-1.32, 2.65],
        [1.32, 2.65],
        [-1.32, -2.65],
        [1.32, -2.65],
      ].map(([x, z]) => (
        <group key={`wheel-${x}-${z}`} position={[x, 0.62, z]}>
          <mesh rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.62, 0.62, 0.38, 14]} />
            <meshStandardMaterial color={PALETTE.busWheel} roughness={0.92} metalness={0.1} />
          </mesh>
          <mesh rotation-z={Math.PI / 2} position-x={x > 0 ? 0.21 : -0.21}>
            <cylinderGeometry args={[0.27, 0.27, 0.04, 12]} />
            <meshStandardMaterial color={PALETTE.busHub} roughness={0.45} metalness={0.6} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 3.32, 1.25]}>
        <sphereGeometry args={[0.2, 10, 8]} />
        <meshBasicMaterial
          ref={beaconMaterial}
          color={PALETTE.busBeacon}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 3.24, 1.25]}>
        <cylinderGeometry args={[0.16, 0.2, 0.1, 8]} />
        <meshStandardMaterial color="#20262e" roughness={0.7} />
      </mesh>

      <mesh ref={halo} rotation-x={-Math.PI / 2} position-y={0.4}>
        <ringGeometry args={[8.5, 9.9, 64]} />
        <meshBasicMaterial
          ref={haloMaterial}
          color={PALETTE.route}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh position-y={18}>
        <cylinderGeometry args={[0.42, 1, 36, 6, 1, true]} />
        <meshBasicMaterial
          ref={beamMaterial}
          color={PALETTE.route}
          transparent
          opacity={0.24}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {bus.phase !== 'off' && !atStop ? (
        <Html position={[0, 72, 0]} center zIndexRange={[9, 0]} pointerEvents="none">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              borderRadius: 999,
              border: '1px solid rgba(255,190,98,0.85)',
              background: 'rgba(34,22,6,0.88)',
              boxShadow: '0 0 16px rgba(255,178,80,0.35)',
              color: '#ffe0a6',
              font: '700 10px/1.2 var(--font-sans, ui-sans-serif, system-ui, sans-serif)',
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: PALETTE.busBeacon,
                boxShadow: `0 0 8px ${PALETTE.busBeacon}`,
              }}
            />
            SHUTTLE
          </div>
        </Html>
      ) : null}

      <pointLight
        position={[0, 1.3, 6.5]}
        color={PALETTE.busHeadlight}
        intensity={90}
        distance={48}
        decay={2}
      />
    </group>
  );
}
