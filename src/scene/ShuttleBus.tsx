import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { BusState } from '../lib/schedule';
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
  const beaconMaterial = useRef<THREE.MeshStandardMaterial>(null);

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

    const pulse = reducedMotion ? 0.35 : 0.35 + Math.sin(state.clock.elapsedTime * 1.6) * 0.25;
    if (halo.current) halo.current.scale.setScalar(1 + pulse * 0.04);
    if (haloMaterial.current) {
      haloMaterial.current.opacity = reducedMotion ? 0.3 : 0.26 + pulse * 0.06;
    }
    if (beaconMaterial.current) {
      beaconMaterial.current.emissiveIntensity = reducedMotion ? 1 : 0.7 + pulse * 0.8;
    }
  });

  return (
    <group
      ref={group}
      position={[bus.position.x, 0, bus.position.z]}
      rotation-y={bus.heading}
      scale={2.4}
    >
      <mesh rotation-x={-Math.PI / 2} position-y={0.06} scale={[1.35, 2.1, 1]} renderOrder={0}>
        <circleGeometry args={[4.6, 28]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.07} scale={[1, 1.5, 1]} renderOrder={1}>
        <circleGeometry args={[4.6, 28]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} depthWrite={false} />
      </mesh>

      <mesh position-y={0.95}>
        <boxGeometry args={[2.45, 0.82, 8.2]} />
        <meshStandardMaterial
          color={PALETTE.busBody}
          roughness={0.42}
          metalness={0.18}
          emissive="#241a3c"
          emissiveIntensity={0.12}
        />
      </mesh>
      <mesh position-y={2.18}>
        <boxGeometry args={[2.55, 1.68, 8.3]} />
        <meshStandardMaterial
          color={PALETTE.busUpper}
          roughness={0.46}
          metalness={0.14}
          emissive="#2a2040"
          emissiveIntensity={0.14}
        />
      </mesh>
      <mesh position-y={3.1}>
        <boxGeometry args={[2.35, 0.24, 7.9]} />
        <meshStandardMaterial color={PALETTE.busBody} roughness={0.38} metalness={0.24} />
      </mesh>
      <mesh position={[0, 3.24, 0]}>
        <boxGeometry args={[0.46, 0.04, 6.9]} />
        <meshStandardMaterial color={PALETTE.busAccent} roughness={0.4} metalness={0.35} />
      </mesh>

      <mesh position={[0, 2.48, 0.1]}>
        <boxGeometry args={[2.6, 0.8, 5.9]} />
        <meshStandardMaterial
          color={PALETTE.busGlass}
          roughness={0.16}
          metalness={0.4}
          emissive={PALETTE.busInterior}
          emissiveIntensity={0.55}
        />
      </mesh>
      <mesh position={[0, 2.38, 4.17]}>
        <boxGeometry args={[2.25, 0.95, 0.1]} />
        <meshStandardMaterial color={PALETTE.busGlass} roughness={0.14} metalness={0.46} />
      </mesh>
      <mesh position={[0, 2.42, -4.17]}>
        <boxGeometry args={[2.15, 0.78, 0.1]} />
        <meshStandardMaterial
          color={PALETTE.busGlass}
          roughness={0.16}
          metalness={0.42}
          emissive={PALETTE.busInterior}
          emissiveIntensity={0.3}
        />
      </mesh>

      <mesh position={[0, 1.52, 4.2]}>
        <boxGeometry args={[1.7, 0.26, 0.06]} />
        <meshStandardMaterial color={PALETTE.busBody} roughness={0.4} metalness={0.3} />
      </mesh>

      <mesh position={[0, 0.78, 4.02]}>
        <boxGeometry args={[2.6, 0.32, 0.28]} />
        <meshStandardMaterial color={PALETTE.busBodyDark} roughness={0.72} metalness={0.12} />
      </mesh>

      {[-0.85, 0.85].map((x) => (
        <mesh key={`head-${x}`} position={[x, 1.42, 4.2]}>
          <sphereGeometry args={[0.2, 10, 8]} />
          <meshStandardMaterial
            color={PALETTE.busHeadlight}
            emissive={PALETTE.busHeadlight}
            emissiveIntensity={1.6}
            roughness={0.3}
          />
        </mesh>
      ))}

      {[-0.85, 0.85].map((x) => (
        <mesh key={`beam-${x}`} position={[x, 1.38, 8.2]} rotation-x={-Math.PI / 2}>
          <coneGeometry args={[1.5, 8, 12, 1, true]} />
          <meshBasicMaterial
            color={PALETTE.busHeadlight}
            transparent
            opacity={0.05}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}

      {[-0.95, 0.95].map((x) => (
        <mesh key={`tail-${x}`} position={[x, 1.48, -4.2]}>
          <boxGeometry args={[0.42, 0.22, 0.06]} />
          <meshStandardMaterial
            color={PALETTE.busTaillight}
            emissive={PALETTE.busTaillight}
            emissiveIntensity={0.9}
            roughness={0.4}
          />
        </mesh>
      ))}

      {[-1.285, 1.285].map((x) => (
        <mesh key={`stripe-${x}`} position={[x, 1.62, 0]}>
          <boxGeometry args={[0.04, 0.16, 7.4]} />
          <meshStandardMaterial color={PALETTE.busAccent} roughness={0.45} metalness={0.35} />
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

      <mesh position={[0, 3.28, 1.25]}>
        <cylinderGeometry args={[0.5, 0.56, 0.06, 16]} />
        <meshStandardMaterial color={PALETTE.busBodyDark} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 3.46, 1.25]}>
        <sphereGeometry args={[0.28, 12, 10]} />
        <meshStandardMaterial
          ref={beaconMaterial}
          color={PALETTE.busBeacon}
          emissive={PALETTE.busBeacon}
          emissiveIntensity={1}
          roughness={0.3}
        />
      </mesh>

      <mesh ref={halo} rotation-x={-Math.PI / 2} position-y={0.16}>
        <ringGeometry args={[3.7, 4.25, 48]} />
        <meshBasicMaterial
          ref={haloMaterial}
          color={PALETTE.busAccent}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <pointLight position={[0, 1.3, 6.5]} color={PALETTE.busHeadlight} intensity={40} distance={34} decay={2} />
    </group>
  );
}
