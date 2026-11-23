import { useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { STOPS, STOP_ORDER } from '../data/route';
import type { StopId } from '../data/types';
import type { SceneCamera } from './contracts';
import {
  layoutLabels,
  stemOrigin,
  type LabelCandidate,
  type LabelInsets,
  type LabelPlacement,
} from './labelLayout';
import { CATEGORY_ACCENT, PALETTE } from './palette';
import { SCENE_PLACES } from './places';
import { STOP_ANCHOR_HEIGHT } from './StopMarkers';

export interface SceneLabelInput {
  camera: THREE.Camera;
  width: number;
  height: number;
  busX: number;
  busZ: number;
  busVisible: boolean;
}

export interface SceneLabelHandle {
  update: (input: SceneLabelInput) => void;
  remeasure: () => void;
}

interface SceneLabelsProps {
  selectedStop: StopId | null;
  pinnedStops: StopId[];
  camera: SceneCamera;
  reducedMotion: boolean;
  onSelectStop: (stop: StopId) => void;
  onCameraChange: (camera: SceneCamera) => void;
}

const MOBILE_LABEL: Record<StopId, string> = {
  ramseyer: 'RAM',
  akenson: 'Ake',
  rosedale: 'Ros',
  'lower-riley': 'Riley',
  graham: 'Graham',
  'brc-totino': 'BRC',
  erickson: 'Erick',
};

/**
 * The 3D labels do not receive the day's Billy stop, so both shared-nickname
 * stops use their building names instead of printing "The Billy" twice.
 */
function sceneStopLabel(id: StopId): string {
  if (id === 'graham') return 'Graham';
  if (id === 'brc-totino') return 'BRC / Totino';
  return STOPS[id].shortName;
}

const EDGE_TEXT: Record<'north' | 'south' | 'east' | 'west', string> = {
  north: 'Shuttle north ↑',
  south: 'Shuttle south ↓',
  east: 'Shuttle east →',
  west: 'Shuttle west ←',
};

const DEFAULT_INSETS: LabelInsets = { top: 64, right: 12, bottom: 92, left: 12 };
const PLACE_LIMIT = 22;

function readInsets(root: HTMLElement): LabelInsets {
  const style = getComputedStyle(root);
  const read = (name: string, fallback: number): number => {
    const value = Number.parseFloat(style.getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    top: read('--scene-inset-top', DEFAULT_INSETS.top),
    right: read('--scene-inset-right', DEFAULT_INSETS.right),
    bottom: read('--scene-inset-bottom', DEFAULT_INSETS.bottom),
    left: read('--scene-inset-left', DEFAULT_INSETS.left),
  };
}

interface Size {
  width: number;
  height: number;
}

function applyNode(
  node: HTMLElement | null,
  visible: boolean,
  x: number,
  y: number,
  zIndex: number,
): void {
  if (!node) return;
  if (!visible) {
    node.dataset.hidden = 'true';
    return;
  }
  node.dataset.hidden = 'false';
  node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  node.style.zIndex = String(zIndex);
}

function applyStem(
  node: HTMLElement | null,
  visible: boolean,
  anchorX: number,
  anchorY: number,
  placement: { x: number; y: number; width: number; height: number } | null,
  color: string,
): void {
  if (!node) return;
  if (!visible || !placement) {
    node.dataset.hidden = 'true';
    return;
  }

  const origin = stemOrigin(placement, anchorX, anchorY);
  const dx = anchorX - origin.x;
  const dy = anchorY - origin.y;
  const length = Math.hypot(dx, dy);

  if (length < 8) {
    node.dataset.hidden = 'true';
    return;
  }

  node.dataset.hidden = 'false';
  node.style.width = `${length}px`;
  node.style.background = color;
  node.style.transform = `translate3d(${origin.x}px, ${origin.y}px, 0) rotate(${Math.atan2(dy, dx)}rad)`;
}

export function SceneLabels({
  selectedStop,
  pinnedStops,
  camera,
  reducedMotion,
  onSelectStop,
  onCameraChange,
  ref,
}: SceneLabelsProps & { ref?: RefObject<SceneLabelHandle | null> }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stopRefs = useRef(new Map<string, HTMLButtonElement>());
  const placeRefs = useRef(new Map<string, HTMLDivElement>());
  const stemRefs = useRef(new Map<string, HTMLSpanElement>());
  const busRef = useRef<HTMLDivElement>(null);
  const edgeRef = useRef<HTMLButtonElement>(null);
  const edgeTextRef = useRef<HTMLSpanElement>(null);
  const sizes = useRef(new Map<string, Size>());
  const dirty = useRef(true);
  const insets = useRef<LabelInsets>(DEFAULT_INSETS);
  const edgeSide = useRef<'north' | 'south' | 'east' | 'west'>('south');
  const pinnedKey = pinnedStops.join(',');

  const temps = useMemo(
    () => ({
      world: new THREE.Vector3(),
      cameraSpace: new THREE.Vector3(),
    }),
    [],
  );

  const measure = (): void => {
    const sizeMap = sizes.current;
    sizeMap.clear();
    stopRefs.current.forEach((node, id) => {
      sizeMap.set(`stop:${id}`, { width: node.offsetWidth, height: node.offsetHeight });
    });
    placeRefs.current.forEach((node, id) => {
      sizeMap.set(`place:${id}`, { width: node.offsetWidth, height: node.offsetHeight });
    });
    if (busRef.current) {
      sizeMap.set('bus', {
        width: busRef.current.offsetWidth,
        height: busRef.current.offsetHeight,
      });
    }
    if (edgeRef.current) {
      sizeMap.set('edge', {
        width: edgeRef.current.offsetWidth,
        height: edgeRef.current.offsetHeight,
      });
    }
  };

  useLayoutEffect(() => {
    dirty.current = true;
  }, [selectedStop, pinnedKey]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      insets.current = readInsets(root);
      dirty.current = true;
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      remeasure: () => {
        dirty.current = true;
      },
      update: (input: SceneLabelInput) => {
        const root = rootRef.current;
        if (!root || input.width < 1 || input.height < 1) return;

        const { camera: sceneCamera, width, height } = input;
        const compactViewport = width < 520;
        if (root.dataset.compact !== String(compactViewport)) {
          root.dataset.compact = String(compactViewport);
          dirty.current = true;
        }
        sceneCamera.updateMatrixWorld();
        sceneCamera.matrixWorldInverse.copy(sceneCamera.matrixWorld).invert();

        const project = (x: number, y: number, z: number) => {
          temps.world.set(x, y, z);
          temps.cameraSpace.copy(temps.world).applyMatrix4(sceneCamera.matrixWorldInverse);
          temps.world.project(sceneCamera);
          return {
            x: (temps.world.x * 0.5 + 0.5) * width,
            y: (-temps.world.y * 0.5 + 0.5) * height,
            behind: temps.cameraSpace.z > -1,
          };
        };

        if (dirty.current) {
          insets.current = readInsets(root);
          measure();
          dirty.current = false;
        }

        const candidates: LabelCandidate[] = [];
        const obstacles: LabelPlacement[] = [];
        const projected = new Map<string, { x: number; y: number; behind: boolean }>();

        // Live shuttle badge. Its anchor is the bus itself; the solver lifts the
        // pill above the roof with a leader stem back down to the vehicle.
        if (input.busVisible) {
          const bus = project(input.busX, 10, input.busZ);
          const busOffscreen =
            bus.behind || bus.x < 0 || bus.x > width || bus.y < 0 || bus.y > height;
          if (!busOffscreen) {
            const size = sizes.current.get('bus');
            if (size && size.width > 0) {
              candidates.push({
                id: 'bus',
                priority: 1000,
                x: bus.x,
                y: bus.y,
                width: size.width,
                height: size.height,
                gap: 54,
                required: true,
              });
              projected.set('bus', bus);
            }
            if (!busOffscreen) {
              obstacles.push({
                id: 'obstacle:bus-body',
                x: bus.x - 34,
                y: bus.y - 20,
                width: 68,
                height: 40,
                visible: true,
              });
            }
          }

          if (busOffscreen) {
            const camSpace = temps.cameraSpace;
            const right = width - insets.current.right;
            const bottom = height - insets.current.bottom;
            const centerX = (insets.current.left + right) / 2;
            const centerY = (insets.current.top + bottom) / 2;
            let dx = camSpace.x;
            let dy = -camSpace.y;
            if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) dy = 1;
            const horizontal = Math.abs(dx) > Math.abs(dy);
            const side = horizontal
              ? dx > 0
                ? 'east'
                : 'west'
              : dy > 0
                ? 'south'
                : 'north';

            if (side !== edgeSide.current) {
              edgeSide.current = side;
              if (edgeTextRef.current) edgeTextRef.current.textContent = EDGE_TEXT[side];
            }

            const tx =
              dx > 0 ? (right - centerX) / dx : dx < 0 ? (insets.current.left - centerX) / dx : Infinity;
            const ty =
              dy > 0 ? (bottom - centerY) / dy : dy < 0 ? (insets.current.top - centerY) / dy : Infinity;
            const t = Math.min(tx, ty);
            const edgeX = centerX + dx * t;
            const edgeY = centerY + dy * t;

            if (edgeRef.current) {
              edgeRef.current.dataset.side = side;
              sizes.current.set('edge', {
                width: edgeRef.current.offsetWidth,
                height: edgeRef.current.offsetHeight,
              });
            }
            const size = sizes.current.get('edge');
            if (size && size.width > 0) {
              candidates.push({
                id: 'edge',
                priority: 995,
                x: edgeX,
                y: edgeY,
                width: size.width,
                height: size.height,
                gap: 2,
                required: true,
              });
              projected.set('edge', { x: edgeX, y: edgeY, behind: false });
            }
          }
        }

        // Pinned and selected stops outrank the rest of the ground labels.
        const pinned = new Set(pinnedStops);
        for (const id of STOP_ORDER) {
          const stop = STOPS[id];
          const point = project(stop.x, STOP_ANCHOR_HEIGHT, stop.z);
          const size = sizes.current.get(`stop:${id}`);
          if (!size || size.width <= 0) continue;
          const visible =
            !point.behind &&
            point.x > -80 &&
            point.x < width + 80 &&
            point.y > -80 &&
            point.y < height + 80;
          if (!visible) continue;
          projected.set(`stop:${id}`, point);
          candidates.push({
            id: `stop:${id}`,
            priority: selectedStop === id ? 900 : pinned.has(id) ? 850 : stop.primary ? 620 : 600,
            x: point.x,
            y: point.y,
            width: size.width,
            height: size.height,
            gap: 10,
          });
        }

        // Official building and landmark labels: only when there is real room.
        const compact = width < 520;
        const medium = width < 760;
        const maxPlaces = compact ? 3 : medium ? 8 : PLACE_LIMIT;
        const placeCandidates: {
          candidate: LabelCandidate;
          point: { x: number; y: number; behind: boolean };
        }[] = [];

        for (const place of SCENE_PLACES) {
          if (compact && place.category !== 'landmark') continue;
          const point = project(place.x, place.y, place.z);
          const size = sizes.current.get(`place:${place.id}`);
          if (!size || size.width <= 0 || point.behind) continue;
          if (point.x < -40 || point.x > width + 40 || point.y < -40 || point.y > height + 40) {
            continue;
          }
          const priority =
            place.category === 'landmark'
              ? 320
              : place.category === 'athletic'
                ? 260
                : place.category === 'context'
                  ? 180
                  : 220;
          placeCandidates.push({
            candidate: {
              id: `place:${place.id}`,
              priority,
              x: point.x,
              y: point.y,
              width: size.width,
              height: size.height,
              gap: 6,
            },
            point,
          });
        }

        placeCandidates.sort(
          (left, right) => right.candidate.priority - left.candidate.priority,
        );
        placeCandidates.length = Math.min(placeCandidates.length, maxPlaces);

        for (const entry of placeCandidates) {
          candidates.push(entry.candidate);
          projected.set(entry.candidate.id, entry.point);
        }

        const placements = layoutLabels(candidates, width, height, insets.current, obstacles);
        const byId = new Map(placements.map((placement) => [placement.id, placement]));

        const busPlacement = byId.get('bus');
        applyNode(
          busRef.current,
          Boolean(busPlacement?.visible),
          busPlacement?.x ?? 0,
          busPlacement?.y ?? 0,
          9,
        );
        const busAnchor = projected.get('bus');
        applyStem(
          stemRefs.current.get('bus') ?? null,
          Boolean(busPlacement?.visible && busAnchor),
          busAnchor?.x ?? 0,
          busAnchor?.y ?? 0,
          busPlacement && busPlacement.visible ? busPlacement : null,
          PALETTE.route,
        );

        const edgePlacement = byId.get('edge');
        applyNode(
          edgeRef.current,
          Boolean(edgePlacement?.visible),
          edgePlacement?.x ?? 0,
          edgePlacement?.y ?? 0,
          9,
        );

        for (const id of STOP_ORDER) {
          const key = `stop:${id}`;
          const placement = byId.get(key);
          const anchor = projected.get(key);
          const node = stopRefs.current.get(id) ?? null;
          const visible = Boolean(placement?.visible);
          applyNode(
            node,
            visible,
            placement?.x ?? 0,
            placement?.y ?? 0,
            selectedStop === id ? 8 : pinned.has(id) ? 7 : 6,
          );
          applyStem(
            stemRefs.current.get(key) ?? null,
            visible && Boolean(anchor),
            anchor?.x ?? 0,
            anchor?.y ?? 0,
            placement && placement.visible ? placement : null,
            selectedStop === id || pinned.has(id) ? PALETTE.stopSelected : PALETTE.stop,
          );
        }

        for (const place of SCENE_PLACES) {
          const key = `place:${place.id}`;
          const placement = byId.get(key);
          const anchor = projected.get(key);
          applyNode(placeRefs.current.get(place.id) ?? null, Boolean(placement?.visible), placement?.x ?? 0, placement?.y ?? 0, 3);
          applyStem(
            stemRefs.current.get(key) ?? null,
            Boolean(placement?.visible && anchor),
            anchor?.x ?? 0,
            anchor?.y ?? 0,
            placement && placement.visible ? placement : null,
            CATEGORY_ACCENT[place.category],
          );
        }

        root.dataset.camera = camera;
      },
    }),
    [camera, onSelectStop, pinnedKey, selectedStop, temps],
  );

  const pinned = new Set(pinnedStops);

  return (
    <div
      className={`scene-labels${reducedMotion ? ' scene-labels--still' : ''}`}
      ref={rootRef}
      role="group"
      aria-label="Campus stop labels"
    >
      <div className="scene-labels__stems" aria-hidden="true">
        <span
          className="scene-stem scene-stem--bus"
          ref={(node) => {
            if (node) stemRefs.current.set('bus', node);
            return () => {
              stemRefs.current.delete('bus');
            };
          }}
        />
        {STOP_ORDER.map((id) => (
          <span
            key={`stem-${id}`}
            className="scene-stem scene-stem--stop"
            ref={(node) => {
              if (node) stemRefs.current.set(`stop:${id}`, node);
              return () => {
                stemRefs.current.delete(`stop:${id}`);
              };
            }}
          />
        ))}
        {SCENE_PLACES.map((place) => (
          <span
            key={`stem-place-${place.id}`}
            className="scene-stem scene-stem--place"
            ref={(node) => {
              if (node) stemRefs.current.set(`place:${place.id}`, node);
              return () => {
                stemRefs.current.delete(`place:${place.id}`);
              };
            }}
          />
        ))}
      </div>

      {STOP_ORDER.map((id) => {
        const stop = STOPS[id];
        const selected = selectedStop === id;
        const isPinned = pinned.has(id);
        return (
          <button
            key={id}
            type="button"
            ref={(node) => {
              if (node) stopRefs.current.set(id, node);
              return () => {
                stopRefs.current.delete(id);
              };
            }}
            className={[
              'scene-label',
              'scene-label--stop',
              stop.primary ? 'scene-label--primary' : '',
              selected ? 'is-selected' : '',
              isPinned ? 'is-pinned' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            data-hidden="true"
            aria-pressed={selected}
            aria-label={`${stop.name}. ${isPinned ? 'Pinned stop. ' : ''}Select for next departures.`}
            title={`${stop.name} — ${stop.subtitle}`}
            onClick={() => onSelectStop(id)}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <span className="scene-label__dot" aria-hidden="true" />
            <span className="scene-label__full">{sceneStopLabel(id)}</span>
            <span className="scene-label__short" aria-hidden="true">
              {MOBILE_LABEL[id]}
            </span>
          </button>
        );
      })}

      {SCENE_PLACES.map((place) => (
        <div
          key={place.id}
          ref={(node) => {
            if (node) placeRefs.current.set(place.id, node);
            return () => {
                placeRefs.current.delete(place.id);
              };
          }}
          className={`scene-label scene-label--place scene-label--${place.category}`}
          data-hidden="true"
          aria-hidden="true"
        >
          <span className="scene-label__mark" aria-hidden="true" />
          <span className="scene-label__text">{place.shortName}</span>
        </div>
      ))}

      <div className="scene-label scene-label--bus" ref={busRef} data-hidden="true" aria-hidden="true">
        <span className="scene-label__beacon" aria-hidden="true" />
        <span>Shuttle</span>
      </div>

      <button
        type="button"
        ref={edgeRef}
        className="scene-label scene-label--edge"
        data-hidden="true"
        aria-label="The shuttle is outside the current view. Follow the shuttle."
        onClick={() => onCameraChange('follow')}
      >
        <span ref={edgeTextRef}>{EDGE_TEXT.south}</span>
      </button>
    </div>
  );
}
