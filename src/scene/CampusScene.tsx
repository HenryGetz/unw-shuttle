import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { StopId } from '../data/types';
import type { BusState } from '../lib/schedule';
import { CameraRig, DEFAULT_CAMERA_POSITION, type CameraPresetId } from './CameraRig';
import { CampusTerrain } from './CampusTerrain';
import { RouteOverlay } from './RouteOverlay';
import { ShuttleBus } from './ShuttleBus';
import { StopMarkers } from './StopMarkers';
import { PALETTE, type BusAnchor } from './palette';

export interface CampusSceneProps {
  bus: BusState;
  selectedStop: StopId | null;
  onSelectStop: (stop: StopId) => void;
}

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
};

const CONTROLS_STYLE: CSSProperties = {
  position: 'absolute',
  top: 12,
  left: 12,
  zIndex: 20,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  maxWidth: 'calc(100% - 24px)',
  padding: 5,
  borderRadius: 10,
  border: '1px solid rgba(112,180,224,0.2)',
  background: 'rgba(4,10,20,0.74)',
  backdropFilter: 'blur(8px)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.38)',
  fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)',
};

const LOCATOR_STYLE: CSSProperties = {
  position: 'absolute',
  left: '50%',
  bottom: 16,
  zIndex: 19,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '5px 10px',
  borderRadius: 999,
  border: '1px solid rgba(255,190,98,0.5)',
  background: 'rgba(22,15,6,0.86)',
  boxShadow: '0 0 18px rgba(255,178,80,0.16)',
  color: '#ffdca6',
  font: '600 10px/1 var(--font-sans, ui-sans-serif, system-ui, sans-serif)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  transform: 'translateX(-50%)',
  willChange: 'opacity',
};

const BUTTON_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 30,
  padding: '0 10px',
  borderRadius: 7,
  border: '1px solid transparent',
  background: 'transparent',
  font: '600 11px/1 ui-sans-serif, system-ui, sans-serif',
  letterSpacing: '0.04em',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

function buttonStyle(active: boolean, reducedMotion: boolean): CSSProperties {
  return {
    ...BUTTON_STYLE,
    background: active ? 'rgba(63,231,255,0.16)' : 'rgba(18,32,50,0.66)',
    borderColor: active ? 'rgba(63,231,255,0.72)' : 'rgba(120,160,200,0.22)',
    color: active ? '#b6f6ff' : '#c8d8e8',
    transition: reducedMotion
      ? 'none'
      : 'background-color 160ms ease, border-color 160ms ease, color 160ms ease',
  };
}

interface BusLocatorProps {
  anchor: BusAnchor;
  visible: boolean;
  onChange: (offscreenSouth: boolean) => void;
}

function BusLocator({ anchor, visible, onChange }: BusLocatorProps) {
  const camera = useThree((state) => state.camera);
  const world = useMemo(() => new THREE.Vector3(), []);
  const local = useMemo(() => new THREE.Vector3(), []);
  const shown = useRef(false);

  useFrame(() => {
    if (!visible) {
      if (shown.current) {
        shown.current = false;
        onChange(false);
      }
      return;
    }

    world.set(anchor.x, 16, anchor.z);
    local.copy(world).applyMatrix4(camera.matrixWorldInverse);
    const behind = local.z > -camera.near;
    world.project(camera);
    const south = !behind && world.y < -1.02;
    if (south !== shown.current) {
      shown.current = south;
      onChange(south);
    }
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
        color: '#d7e6f5',
        fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)',
      }}
    >
      <div style={{ maxWidth: 360, textAlign: 'center' }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#6f8dab',
          }}
        >
          3D campus
        </div>
        <div style={{ marginTop: 8, fontSize: 16, fontWeight: 650 }}>WebGL is unavailable</div>
        <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: '#8fa6bc' }}>
          This browser could not start the 3D map. Stop times and the shuttle schedule still work.
          Enable hardware acceleration or try another browser to see the campus.
        </div>
      </div>
    </div>
  );
}

export function CampusScene({ bus, selectedStop, onSelectStop }: CampusSceneProps) {
  const webgl = useMemo(detectWebGL, []);
  const reducedMotion = usePrefersReducedMotion();
  const [following, setFollowing] = useState(false);
  const [preset, setPreset] = useState<CameraPresetId>('campus');
  const [presetFramed, setPresetFramed] = useState(true);
  const [viewKey, setViewKey] = useState(0);
  const [busSouth, setBusSouth] = useState(false);
  const anchor = useRef<BusAnchor>({ x: bus.position.x, z: bus.position.z }).current;

  const showPreset = (next: CameraPresetId) => {
    setFollowing(false);
    setPreset(next);
    setPresetFramed(true);
    setViewKey((value) => value + 1);
  };

  if (!webgl) return <SceneFallback />;

  return (
    <div style={ROOT_STYLE}>
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: DEFAULT_CAMERA_POSITION, fov: 46, near: 2, far: 16000 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <color attach="background" args={[PALETTE.background]} />
        <fogExp2 attach="fog" args={[PALETTE.fog, 0.00017]} />

        <CameraRig
          anchor={anchor}
          following={following}
          preset={preset}
          viewKey={viewKey}
        />

        <ambientLight color="#8ea9d8" intensity={0.5} />
        <hemisphereLight args={['#87a8e0', '#050912', 0.68]} />
        <directionalLight color="#c2d6ff" intensity={2.4} position={[720, 1380, 1140]} />
        <pointLight
          color="#ffb26b"
          intensity={1200}
          distance={480}
          decay={2}
          position={[-40, 18, -486]}
        />
        <pointLight
          color="#ff9d5c"
          intensity={900}
          distance={400}
          decay={2}
          position={[-36, 16, 300]}
        />

        <CampusTerrain />
        <RouteOverlay activeRoute={bus.route.id} />
        {/* The first Html in the scene is lost while drei creates its shared portal. */}
        <Html position={[0, -1000, 0]}>
          <span aria-hidden="true" />
        </Html>
        <StopMarkers selectedStop={selectedStop} onSelectStop={onSelectStop} />
        <ShuttleBus bus={bus} anchor={anchor} reducedMotion={reducedMotion} />
        <BusLocator
          anchor={anchor}
          visible={bus.phase !== 'off'}
          onChange={setBusSouth}
        />
      </Canvas>

      <div
        style={{
          ...LOCATOR_STYLE,
          opacity: busSouth && bus.phase !== 'off' ? 1 : 0,
          transition: reducedMotion ? 'none' : 'opacity 180ms ease',
        }}
        aria-hidden="true"
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: PALETTE.busBeacon,
            boxShadow: `0 0 8px ${PALETTE.busBeacon}`,
          }}
        />
        Shuttle south
        <span style={{ fontSize: 11, lineHeight: 1 }}>↓</span>
      </div>

      <div style={CONTROLS_STYLE} role="group" aria-label="3D campus controls">
        <button
          type="button"
          aria-pressed={following}
          title={following ? 'Stop following the shuttle' : 'Keep the camera centered on the shuttle'}
          onClick={() => {
            setFollowing((value) => !value);
            setPresetFramed(false);
          }}
          style={buttonStyle(following, reducedMotion)}
        >
          <span
            aria-hidden
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: following ? PALETTE.route : '#6b7f92',
              boxShadow: following ? `0 0 10px ${PALETTE.route}` : 'none',
            }}
          />
          Follow bus
        </button>
        <button
          type="button"
          aria-pressed={presetFramed && !following && preset === 'campus'}
          title="Frame the campus loop"
          onClick={() => showPreset('campus')}
          style={buttonStyle(presetFramed && !following && preset === 'campus', reducedMotion)}
        >
          Campus
        </button>
        <button
          type="button"
          aria-pressed={presetFramed && !following && preset === 'whole'}
          title="Frame the whole route including Rosedale"
          onClick={() => showPreset('whole')}
          style={buttonStyle(presetFramed && !following && preset === 'whole', reducedMotion)}
        >
          Whole route
        </button>
        <button
          type="button"
          title="Return to the default campus view"
          onClick={() => showPreset('campus')}
          style={buttonStyle(false, reducedMotion)}
        >
          Reset view
        </button>
      </div>
    </div>
  );
}
