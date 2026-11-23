import { useLayoutEffect, useMemo, useRef } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import {
  buildBuildingGeometries,
  buildCampusFillGeometry,
  buildRoadGeometry,
  buildTreePlacements,
  buildWaterEdgeGeometry,
  buildWaterGeometries,
  CAMPUS_BOUNDARY,
  type TreePlacement,
} from './geometry';
import {
  BUILDING_EMISSIVE,
  PALETTE,
  TREE_SHADES,
  type BuildingKind,
} from './palette';

function Conifers({ placements }: { placements: TreePlacement[] }) {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const canopies = useRef<THREE.InstancedMesh>(null);
  const caps = useRef<THREE.InstancedMesh>(null);

  const geometries = useMemo(
    () => ({
      trunk: new THREE.CylinderGeometry(0.3, 0.46, 3.2, 5).translate(0, 1.6, 0),
      canopy: new THREE.ConeGeometry(2.5, 7.6, 7).translate(0, 6.8, 0),
      cap: new THREE.ConeGeometry(1.28, 2.4, 7).translate(0, 9.5, 0),
    }),
    [],
  );

  useLayoutEffect(() => {
    if (placements.length === 0) return;
    const helper = new THREE.Object3D();
    const color = new THREE.Color();

    for (let index = 0; index < placements.length; index += 1) {
      const tree = placements[index];
      helper.position.set(tree.x, 0, tree.z);
      helper.rotation.set(0, tree.rotation, 0);
      helper.scale.setScalar(tree.scale);
      helper.updateMatrix();

      trunks.current?.setMatrixAt(index, helper.matrix);
      canopies.current?.setMatrixAt(index, helper.matrix);
      caps.current?.setMatrixAt(index, helper.matrix);

      color.set(TREE_SHADES[tree.variant % TREE_SHADES.length]);
      canopies.current?.setColorAt(index, color);
    }

    for (const mesh of [trunks.current, canopies.current, caps.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [placements]);

  if (placements.length === 0) return null;

  return (
    <group>
      <instancedMesh ref={trunks} args={[geometries.trunk, undefined, placements.length]}>
        <meshStandardMaterial color="#2a2019" roughness={0.95} metalness={0} flatShading />
      </instancedMesh>
      <instancedMesh ref={canopies} args={[geometries.canopy, undefined, placements.length]}>
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.92}
          metalness={0}
          emissive="#07140f"
          emissiveIntensity={0.6}
          flatShading
        />
      </instancedMesh>
      <instancedMesh ref={caps} args={[geometries.cap, undefined, placements.length]}>
        <meshStandardMaterial
          color="#d7e5f3"
          roughness={0.86}
          metalness={0}
          emissive="#1a2735"
          emissiveIntensity={0.25}
          flatShading
        />
      </instancedMesh>
    </group>
  );
}

function BareTrees({ placements }: { placements: TreePlacement[] }) {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const branches = useRef<THREE.InstancedMesh>(null);

  const geometries = useMemo(
    () => ({
      trunk: new THREE.CylinderGeometry(0.22, 0.42, 5.6, 5).translate(0, 2.8, 0),
      branch: new THREE.CylinderGeometry(0.05, 0.2, 3.6, 4).translate(0, 1.8, 0),
    }),
    [],
  );

  const branchCount = placements.length * 4;

  useLayoutEffect(() => {
    if (placements.length === 0) return;
    const helper = new THREE.Object3D();

    for (let index = 0; index < placements.length; index += 1) {
      const tree = placements[index];
      helper.position.set(tree.x, 0, tree.z);
      helper.rotation.set(0, tree.rotation, 0);
      helper.scale.setScalar(tree.scale);
      helper.updateMatrix();
      trunks.current?.setMatrixAt(index, helper.matrix);

      for (let branch = 0; branch < 4; branch += 1) {
        const yaw = tree.rotation + (branch * Math.PI) / 2 + (tree.variant - 1) * 0.32;
        const tilt = 0.55 + ((branch + tree.variant) % 3) * 0.16;
        helper.position.set(tree.x, (3.1 + (branch % 2) * 0.55) * tree.scale, tree.z);
        helper.rotation.set(0, yaw, tilt, 'YXZ');
        helper.scale.setScalar(tree.scale * (0.78 + (branch % 3) * 0.12));
        helper.updateMatrix();
        branches.current?.setMatrixAt(index * 4 + branch, helper.matrix);
      }
    }

    for (const mesh of [trunks.current, branches.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [placements]);

  if (placements.length === 0) return null;

  return (
    <group>
      <instancedMesh ref={trunks} args={[geometries.trunk, undefined, placements.length]}>
        <meshStandardMaterial color="#332820" roughness={0.95} metalness={0} flatShading />
      </instancedMesh>
      <instancedMesh ref={branches} args={[geometries.branch, undefined, branchCount]}>
        <meshStandardMaterial
          color="#63717e"
          roughness={0.88}
          metalness={0}
          emissive="#0d151d"
          emissiveIntensity={0.35}
          flatShading
        />
      </instancedMesh>
    </group>
  );
}

function Trees() {
  const trees = useMemo(() => buildTreePlacements(), []);
  return (
    <group>
      <Conifers placements={trees.conifers} />
      <BareTrees placements={trees.bare} />
    </group>
  );
}

function Buildings() {
  const buildings = useMemo(() => buildBuildingGeometries(), []);

  return (
    <group>
      {buildings.meshes.map(({ kind, geometry }: { kind: BuildingKind; geometry: THREE.BufferGeometry }) => (
        <mesh key={kind} geometry={geometry} frustumCulled={false}>
          <meshStandardMaterial
            vertexColors
            flatShading
            roughness={kind === 'landmark' ? 0.72 : 0.9}
            metalness={0.08}
            emissive={BUILDING_EMISSIVE[kind]}
            emissiveIntensity={kind === 'landmark' ? 0.55 : 0.18}
          />
        </mesh>
      ))}
      {buildings.outlines ? (
        <lineSegments geometry={buildings.outlines} frustumCulled={false}>
          <lineBasicMaterial
            color="#87a6c2"
            transparent
            opacity={0.3}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>
      ) : null}
    </group>
  );
}

function Water() {
  const bodies = useMemo(() => buildWaterGeometries(), []);
  const edges = useMemo(() => buildWaterEdgeGeometry(), []);

  return (
    <group>
      {bodies.map((body, index) => (
        <mesh
          key={body.name ?? `water-${index}`}
          geometry={body.geometry}
          position-y={0.3}
          renderOrder={1}
        >
          <meshStandardMaterial
            color={PALETTE.water}
            roughness={0.2}
            metalness={0.72}
            emissive="#0a2740"
            emissiveIntensity={0.9}
          />
        </mesh>
      ))}
      <lineSegments geometry={edges} frustumCulled={false}>
        <lineBasicMaterial
          color={PALETTE.waterEdge}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

export function CampusTerrain() {
  const campusFill = useMemo(() => buildCampusFillGeometry(), []);
  const roads = useMemo(() => buildRoadGeometry(), []);
  const grid = useRef<THREE.GridHelper>(null);

  useLayoutEffect(() => {
    const material = grid.current?.material;
    if (!material || Array.isArray(material)) return;
    material.transparent = true;
    material.opacity = 0.55;
    material.depthWrite = false;
  }, []);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.04}>
        <planeGeometry args={[16000, 16000]} />
        <meshStandardMaterial color={PALETTE.ground} roughness={0.98} metalness={0.02} />
      </mesh>

      <gridHelper
        ref={grid}
        args={[6000, 120, PALETTE.gridCenter, PALETTE.grid]}
        position={[-120, 0.08, 200]}
      />

      <mesh geometry={campusFill} position-y={0.05} renderOrder={0}>
        <meshStandardMaterial color={PALETTE.campus} roughness={0.95} metalness={0.04} />
      </mesh>

      <Line
        points={CAMPUS_BOUNDARY}
        color={PALETTE.boundary}
        lineWidth={2}
        dashed
        dashSize={42}
        gapSize={26}
        transparent
        opacity={0.8}
        depthWrite={false}
      />

      <Water />

      <lineSegments geometry={roads} frustumCulled={false}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.82}
          depthWrite={false}
        />
      </lineSegments>

      <Buildings />
      <Trees />
    </group>
  );
}
