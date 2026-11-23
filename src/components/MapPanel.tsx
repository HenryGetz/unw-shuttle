import { lazy, Suspense, useState } from 'react';
import type { StopId } from '../data/types';
import { BILLY_FINALS_STOP, STOPS } from '../data/route';
import { nextDeparture } from '../lib/schedule';
import type { BusState, ServiceSnapshot } from '../lib/schedule';
import type { CameraPreference, MapViewMode } from '../lib/prefs';
import { formatRelative, formatTime } from '../lib/time';
import { SCENE_CAMERA_LABEL } from '../scene/contracts';
import { SceneBoundary } from './SceneBoundary';
import { SvgCampusMap, SVG_BUS_OFFMAP_Z } from './SvgCampusMap';

const CampusScene = lazy(() =>
  import('../scene/CampusScene').then((module) => ({ default: module.CampusScene })),
);

interface MapPanelProps {
  now: Date;
  info: ServiceSnapshot;
  bus: BusState;
  billyStop: StopId;
  selectedStop: StopId | null;
  onSelectStop: (stop: StopId) => void;
  viewMode: MapViewMode;
  onViewModeChange: (mode: MapViewMode) => void;
  camera: CameraPreference;
  onCameraChange: (camera: CameraPreference) => void;
  resetToken: number;
  onReset: () => void;
  pinnedStops: StopId[];
}

const CAMERAS: CameraPreference[] = ['follow', 'campus', 'route'];

function supportsWebGL(): boolean {
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

const PHASE_LABEL: Record<BusState['phase'], string> = {
  'in-service': 'In service',
  returning: 'Returning',
  parked: 'Parked',
  off: 'Off duty',
};

export function MapPanel({
  now,
  info,
  bus,
  billyStop,
  selectedStop,
  onSelectStop,
  viewMode,
  onViewModeChange,
  camera,
  onCameraChange,
  resetToken,
  onReset,
  pinnedStops,
}: MapPanelProps) {
  const [webglSupported] = useState(supportsWebGL);
  const show3d = webglSupported && viewMode === '3d';
  const nextStop = bus.nextStop ? STOPS[bus.nextStop].shortName : null;
  const eta = bus.secondsToNextStop !== null ? formatRelative(bus.secondsToNextStop) : null;
  const nextRam = nextDeparture(now, 'ramseyer');
  const rosedale = nextDeparture(now, 'rosedale');
  const rosedaleRequestOnly =
    info.service?.trips.some((trip) => trip.requestOnly.includes('rosedale')) ?? false;
  const rosedaleNote = rosedale
    ? `Next departure ${formatTime(rosedale.atMinutes)}.`
    : rosedaleRequestOnly
      ? 'Request only today.'
      : 'No more departures today.';
  const busSouthOfMap = bus.position.z > SVG_BUS_OFFMAP_Z;
  const routeText = bus.route.id === 'via' ? 'Via Rosedale' : 'Campus loop';
  const billyLabel = billyStop === BILLY_FINALS_STOP ? 'Graham' : STOPS[billyStop].shortName;
  const showNextStop = bus.phase === 'in-service' || bus.phase === 'returning';
  const phaseText = PHASE_LABEL[bus.phase];
  const followShuttle = () => {
    if (!webglSupported) return;
    if (!show3d) onViewModeChange('3d');
    onCameraChange('follow');
  };
  const liveDetail =
    showNextStop && nextStop
      ? `Next ${nextStop}${eta ? ` · ${eta}` : ''}`
      : bus.label;
  const ramText = nextRam
    ? `Next RAM ${formatTime(nextRam.atMinutes)}`
    : info.service
      ? 'Last RAM trip has left'
      : 'No daytime service';

  return (
    <section className="map-hero" aria-labelledby="map-title">
      <h2 id="map-title" className="sr-only">
        Campus shuttle map
      </h2>
      <div className={`map-stage map-hero__stage map-hero__stage--${show3d ? '3d' : '2d'}`}>
        {show3d ? (
          <div className="map-hero__scene">
            <SceneBoundary key="scene-3d" onUseFallback={() => onViewModeChange('2d')}>
              <Suspense fallback={<div className="map-loading">Loading 3D campus…</div>}>
                <CampusScene
                  bus={bus}
                  selectedStop={selectedStop}
                  pinnedStops={pinnedStops}
                  camera={camera}
                  resetToken={resetToken}
                  onSelectStop={onSelectStop}
                  onCameraChange={onCameraChange}
                />
              </Suspense>
            </SceneBoundary>
          </div>
        ) : (
          <>
            <div className="map-hero__scene">
              <SvgCampusMap
                bus={bus}
                billyStop={billyStop}
                selectedStop={selectedStop}
                onSelectStop={onSelectStop}
              />
            </div>
            <div className="map-offmap">
              <button
                type="button"
                className={`map-offmap__chip ${selectedStop === 'rosedale' ? 'is-selected' : ''}`}
                aria-pressed={selectedStop === 'rosedale'}
                aria-label={`Rosedale Square, 1.2 kilometers south of campus. ${rosedaleNote} Select for details.`}
                onClick={() => onSelectStop('rosedale')}
              >
                <span className="map-offmap__arrow" aria-hidden="true">
                  ↓
                </span>
                <span>
                  <strong>Rosedale</strong> · 1.2 km
                </span>
              </button>
              {busSouthOfMap && (
                <p className="map-offmap__chip map-offmap__chip--bus">
                  <span className="map-offmap__arrow" aria-hidden="true">
                    ↓
                  </span>
                  <span>
                    <strong>Shuttle</strong> · south of map
                  </span>
                </p>
              )}
            </div>
          </>
        )}

        <div className="map-hud map-hud--top">
          <button
            type="button"
            className={`map-live map-live--${bus.phase}`}
            onClick={followShuttle}
            disabled={!webglSupported}
            aria-label={`${phaseText}${bus.phase === 'off' ? '' : `, ${routeText}`}. ${liveDetail}. ${ramText}.${
              webglSupported ? ' Follow the shuttle on the map.' : ''
            }`}
          >
            <span className="map-live__dot" aria-hidden="true" />
            <span className="map-live__text">
              <span className="map-live__phase">
                {phaseText}
                {bus.phase !== 'off' && <span className="map-live__route">{routeText}</span>}
              </span>
              <span className="map-live__line">{liveDetail}</span>
              <span className="map-live__ram">{ramText}</span>
            </span>
            {webglSupported && (
              <svg
                className="map-live__arrow"
                viewBox="0 0 16 16"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M3 8h9m-3.5-3.5L12 8l-3.5 3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>

          <div className="segmented map-mode" role="group" aria-label="Map style">
            <button
              type="button"
              className="segmented__button"
              aria-pressed={show3d}
              disabled={!webglSupported}
              title={webglSupported ? 'Show the 3D campus' : 'WebGL is unavailable in this browser'}
              onClick={() => onViewModeChange('3d')}
            >
              3D
            </button>
            <button
              type="button"
              className="segmented__button"
              aria-pressed={!show3d}
              onClick={() => onViewModeChange('2d')}
            >
              2D
            </button>
          </div>
        </div>

        {show3d && (
          <div className="map-hud map-hud--bottom">
            <div className="map-camera" role="group" aria-label="Map camera">
              {CAMERAS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="map-camera__button"
                  aria-pressed={camera === id}
                  onClick={() => onCameraChange(id)}
                >
                  {SCENE_CAMERA_LABEL[id]}
                </button>
              ))}
              <span className="map-camera__divider" aria-hidden="true" />
              <button
                type="button"
                className="map-camera__button map-camera__button--reset"
                onClick={onReset}
                aria-label="Reset map view"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="map-meta">
        <span className="map-meta__item">
          <i className="map-meta__line map-meta__line--active" aria-hidden="true" /> Active loop
        </span>
        <span className="map-meta__item">
          <i className="map-meta__line map-meta__line--inactive" aria-hidden="true" /> Other loop
        </span>
        <span className="map-meta__item map-meta__billy">
          {info.service ? 'Billy stop today' : 'Billy stop next service'}: <strong>{billyLabel}</strong>
          {billyStop === BILLY_FINALS_STOP ? ' · finals timetable' : ''}
        </span>
        <span className="map-meta__item map-meta__note">
          Ericksen request-only · <a href="tel:+16516315310">651-631-5310</a>
        </span>
        <span className="map-meta__item map-meta__note">
          Map ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            OpenStreetMap
          </a>
        </span>
      </div>
    </section>
  );
}
