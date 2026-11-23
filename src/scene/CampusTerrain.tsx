import { useLayoutEffect, useMemo, useRef } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import {
  buildBuildingGeometries,
  buildCampusFillGeometry,
  buildRoadLineSets,
  buildTreePlacements,
  buildWaterEdgeGeometry,
  buildWaterGeometries,
  CAMPUS_BOUNDARY,
  type RoadLineKind,
  type TreePlacement,
} from './geometry';
import {
  BUILDING_EMISSIVE,
  CONIFER_CAP,
  PALETTE,
  TREE_SHADES,
  type BuildingKind,
} from './palette';
import { CATEGORY_ACCENT, CATEGORY_PLINTH } from './palette';
import { SCENE_PLINTHS } from './places';
import type { OfficialCategory } from '../data/officialMap';

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
        <meshStandardMaterial color={PALETTE.treeTrunk} roughness={0.96} metalness={0} flatShading />
      </instancedMesh>
      <instancedMesh ref={canopies} args={[geometries.canopy, undefined, placements.length]}>
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.94}
          metalness={0}
          emissive="#050a07"
          emissiveIntensity={0.22}
          flatShading
        />
      </instancedMesh>
      <instancedMesh ref={caps} args={[geometries.cap, undefined, placements.length]}>
        <meshStandardMaterial
          color={CONIFER_CAP}
          roughness={0.92}
          metalness={0}
          emissive="#0a120c"
          emissiveIntensity={0.18}
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
        <meshStandardMaterial color={PALETTE.treeTrunk} roughness={0.96} metalness={0} flatShading />
      </instancedMesh>
      <instancedMesh ref={branches} args={[geometries.branch, undefined, branchCount]}>
        <meshStandardMaterial
          color={PALETTE.treeBranch}
          roughness={0.92}
          metalness={0}
          emissive="#08060c"
          emissiveIntensity={0.2}
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
            roughness={kind === 'landmark' ? 0.82 : 0.94}
            metalness={0.04}
            emissive={BUILDING_EMISSIVE[kind]}
            emissiveIntensity={kind === 'landmark' ? 0.3 : 0.12}
          />
        </mesh>
      ))}
      {buildings.outlines ? (
        <lineSegments geometry={buildings.outlines} frustumCulled={false}>
          <lineBasicMaterial
            vertexColors
            transparent
            opacity={0.55}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>
      ) : null}
    </group>
  );
}

const PLINTH_CATEGORIES: OfficialCategory[] = ['landmark', 'academic', 'residential', 'athletic', 'context'];

function Plinths() {
  const groups = useMemo(
    () =>
      PLINTH_CATEGORIES.map((category) => ({
        category,
        placements: SCENE_PLINTHS.filter((plinth) => plinth.category === category),
      })).filter((group) => group.placements.length > 0),
    [],
  );
  const pads = useRef(new Map<OfficialCategory, THREE.InstancedMesh>());
  const posts = useRef(new Map<OfficialCategory, THREE.InstancedMesh>());

  useLayoutEffect(() => {
    const helper = new THREE.Object3D();

    for (const group of groups) {
      const pad = pads.current.get(group.category);
      const post = posts.current.get(group.category);
      const padColor = new THREE.Color(CATEGORY_PLINTH[group.category]);
      const postColor = new THREE.Color(CATEGORY_ACCENT[group.category]);

      group.placements.forEach((plinth, index) => {
        helper.position.set(plinth.x, 0, plinth.z);
        helper.rotation.set(0, 0, 0);
        helper.scale.set(plinth.radius, 1.1, plinth.radius);
        helper.updateMatrix();
        pad?.setMatrixAt(index, helper.matrix);
        pad?.setColorAt(index, padColor);

        helper.position.set(plinth.x, 1.8, plinth.z);
        helper.scale.set(1, 1, 1);
        helper.updateMatrix();
        post?.setMatrixAt(index, helper.matrix);
        post?.setColorAt(index, postColor);
      });

      for (const mesh of [pad, post]) {
        if (!mesh) continue;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
    }
  }, [groups]);

  return (
    <group>
      {groups.map((group) => (
        <group key={group.category}>
          <instancedMesh
            ref={(mesh) => {
              if (mesh) pads.current.set(group.category, mesh);
              return () => pads.current.delete(group.category);
            }}
            args={[undefined, undefined, group.placements.length]}
          >
            <cylinderGeometry args={[1, 1.06, 1, 10]} />
            <meshStandardMaterial
              color="#ffffff"
              roughness={0.95}
              metalness={0.02}
              emissive={CATEGORY_PLINTH[group.category]}
              emissiveIntensity={0.16}
              flatShading
            />
          </instancedMesh>
          <instancedMesh
            ref={(mesh) => {
              if (mesh) posts.current.set(group.category, mesh);
              return () => posts.current.delete(group.category);
            }}
            args={[undefined, undefined, group.placements.length]}
          >
            <cylinderGeometry args={[1.3, 1.6, 3.6, 8]} />
            <meshStandardMaterial
              color="#ffffff"
              roughness={0.7}
              metalness={0.1}
              emissive={CATEGORY_ACCENT[group.category]}
              emissiveIntensity={0.12}
              flatShading
            />
          </instancedMesh>
        </group>
      ))}
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
            roughness={0.22}
            metalness={0.58}
            emissive="#0b1430"
            emissiveIntensity={0.7}
          />
        </mesh>
      ))}
      <lineSegments geometry={edges} frustumCulled={false}>
        <lineBasicMaterial
          color={PALETTE.waterEdge}
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

const ROAD_STYLE: Record<RoadLineKind, { color: string; width: number; opacity: number }> = {
  trunk: { color: PALETTE.roadTrunk, width: 3.2, opacity: 0.42 },
  tertiary: { color: PALETTE.roadTertiary, width: 2.2, opacity: 0.37 },
  residential: { color: PALETTE.roadResidential, width: 1.5, opacity: 0.38 },
  service: { color: PALETTE.roadService, width: 1, opacity: 0.3 },
};

function Roads() {
  const sets = useMemo(() => buildRoadLineSets(), []);

  return (
    <group>
      {sets.map((set) => {
        if (set.points.length < 2) return null;
        const style = ROAD_STYLE[set.kind];
        return (
          <Line
            key={set.kind}
            points={set.points}
            segments
            color={style.color}
            lineWidth={style.width}
            transparent
            opacity={style.opacity}
            depthWrite={false}
          />
        );
      })}
    </group>
  );
}

export function CampusTerrain() {
  const campusFill = useMemo(() => buildCampusFillGeometry(), []);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.04}>
        <planeGeometry args={[16000, 16000]} />
        <meshStandardMaterial color={PALETTE.ground} roughness={1} metalness={0} />
      </mesh>

      <mesh geometry={campusFill} position-y={0.05} renderOrder={0}>
        <meshStandardMaterial color={PALETTE.campus} roughness={0.98} metalness={0.02} />
      </mesh>

      <Line
        points={CAMPUS_BOUNDARY}
        color={PALETTE.boundary}
        lineWidth={1.4}
        dashed
        dashSize={34}
        gapSize={30}
        transparent
        opacity={0.34}
        depthWrite={false}
      />

      <Water />
      <Roads />

      <Buildings />
      <Plinths />
      <Trees />
    </group>
  );
}
