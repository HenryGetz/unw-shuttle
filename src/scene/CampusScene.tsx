import '../styles/map.css';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { StopId } from '../data/types';
import { CameraRig } from './CameraRig';
import { CampusTerrain } from './CampusTerrain';
import { busFocusStop, type CampusSceneProps } from './contracts';
import { RouteOverlay } from './RouteOverlay';
import type { SceneLabelHandle } from './SceneLabels';
import { SceneLabels } from './SceneLabels';
import { ShuttleBus } from './ShuttleBus';
import { StopMarkers } from './StopMarkers';
import { PALETTE, type BusAnchor } from './palette';

function detectWebGL(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    setReduced(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

const ROOT_STYLE: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  minHeight: 320,
  overflow: 'hidden',
  background: PALETTE.background,
  isolation: 'isolate',
  touchAction: 'pan-y',
};

function LabelProjector({
  anchor,
  busVisible,
  overlay,
}: {
  anchor: BusAnchor;
  busVisible: boolean;
  overlay: { current: SceneLabelHandle | null };
}) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (elapsed.current < 1 / 15) return;
    elapsed.current = 0;
    overlay.current?.update({
      camera,
      width: size.width,
      height: size.height,
      busX: anchor.x,
      busZ: anchor.z,
      busVisible,
    });
  });

  return null;
}

function SceneFallback() {
  return (
    <div
      style={{
        ...ROOT_STYLE,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        color: 'var(--text-2, #d8cfe5)',
        fontFamily: 'var(--font-body, ui-sans-serif, system-ui, sans-serif)',
      }}
    >
      <div style={{ maxWidth: 360, textAlign: 'center' }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-4, #7e7194)',
          }}
        >
          3D campus
        </div>
        <div style={{ marginTop: 8, fontSize: 16, fontWeight: 650 }}>WebGL is unavailable</div>
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            lineHeight: 1.55,
            color: 'var(--text-3, #a99cbf)',
          }}
        >
          This browser could not start the 3D map. Stop times and the shuttle schedule still work.
          Enable hardware acceleration or switch to the 2D map.
        </div>
      </div>
    </div>
  );
}

export function CampusScene({
  bus,
  billyStop,
  selectedStop,
  pinnedStops,
  labelsVisible,
  camera,
  resetToken,
  onSelectStop,
  onCameraChange,
}: CampusSceneProps) {
  const webgl = useMemo(detectWebGL, []);
  const reducedMotion = usePrefersReducedMotion();
  const anchor = useRef<BusAnchor>({ x: bus.position.x, z: bus.position.z }).current;
  const overlay = useRef<SceneLabelHandle | null>(null);
  const [hoveredStop, setHoveredStop] = useState<StopId | null>(null);
  const focusStop = busFocusStop(bus);

  if (!webgl) return <SceneFallback />;

  return (
    <div style={ROOT_STYLE} className="scene-root">
      <Canvas
        className="scene-canvas"
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [540, 1180, 1760], fov: 44, near: 2, far: 20000 }}
        style={{ touchAction: 'pan-y' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
        }}
      >
        <color attach="background" args={[PALETTE.background]} />
        <fogExp2 attach="fog" args={[PALETTE.fog, 0.00008]} />

        <CameraRig anchor={anchor} mode={camera} resetToken={resetToken} />

        <ambientLight color="#a291c8" intensity={0.54} />
        <hemisphereLight args={['#a897d0', '#0b0714', 0.68]} />
        <directionalLight color="#e6dcff" intensity={2.1} position={[-760, 1120, 920]} />
        <directionalLight color="#ffd9a8" intensity={0.6} position={[620, 420, -820]} />
        <pointLight color="#ffb26b" intensity={520} distance={430} decay={2} position={[-60, 22, -470]} />
        <pointLight color="#ff9d5c" intensity={340} distance={360} decay={2} position={[-30, 18, 250]} />
        <pointLight color="#d9c2ff" intensity={220} distance={320} decay={2} position={[-200, 20, -40]} />

        <CampusTerrain />
        <RouteOverlay activeRoute={bus.route.id} />
        <StopMarkers
          selectedStop={selectedStop}
          pinnedStops={pinnedStops}
          hoveredStop={hoveredStop}
          onSelectStop={onSelectStop}
          onHoverStop={setHoveredStop}
        />
        <ShuttleBus bus={bus} anchor={anchor} reducedMotion={reducedMotion} />
        <LabelProjector anchor={anchor} busVisible={bus.phase !== 'off'} overlay={overlay} />
      </Canvas>

      <SceneLabels
        ref={overlay}
        selectedStop={selectedStop}
        pinnedStops={pinnedStops}
        focusStop={focusStop}
        hoveredStop={hoveredStop}
        billyStop={billyStop}
        labelsVisible={labelsVisible}
        reducedMotion={reducedMotion}
        onSelectStop={onSelectStop}
        onCameraChange={onCameraChange}
      />
    </div>
  );
}
