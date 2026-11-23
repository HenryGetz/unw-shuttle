import { lazy, Suspense, useState } from 'react';
import type { StopId } from '../data/types';
import { BILLY_FINALS_STOP, STOPS } from '../data/route';
import { nextDeparture } from '../lib/schedule';
import type { BusState, ServiceSnapshot } from '../lib/schedule';
import { formatRelative, formatTime } from '../lib/time';
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
}

type MapMode = '3d' | '2d';

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
}: MapPanelProps) {
  const [webglSupported] = useState(supportsWebGL);
  const [mode, setMode] = useState<MapMode>(() => (webglSupported ? '3d' : '2d'));
  const show3d = webglSupported && mode === '3d';
  const nextStop = bus.nextStop ? STOPS[bus.nextStop].shortName : null;
  const eta = bus.secondsToNextStop !== null ? formatRelative(bus.secondsToNextStop) : null;
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

  return (
    <section className="panel map-panel" aria-labelledby="map-title">
      <div className="panel-head map-panel__head">
        <div>
          <p className="eyebrow">Route simulation</p>
          <h2 id="map-title">Campus map</h2>
        </div>
        <div className="segmented" role="group" aria-label="Map view">
          <button
            type="button"
            className="segmented__button"
            aria-pressed={show3d}
            disabled={!webglSupported}
            title={webglSupported ? 'Show the 3D campus' : 'WebGL is unavailable in this browser'}
            onClick={() => setMode('3d')}
          >
            3D
          </button>
          <button
            type="button"
            className="segmented__button"
            aria-pressed={!show3d}
            onClick={() => setMode('2d')}
          >
            2D
          </button>
        </div>
      </div>

      <div className={`bus-chip bus-chip--${bus.phase}`}>
        <span className="bus-chip__dot" aria-hidden="true" />
        <div className="bus-chip__body">
          <p className="bus-chip__phase">
            {PHASE_LABEL[bus.phase]}
            {bus.phase !== 'off' && <span className="bus-chip__route"> · {routeText}</span>}
          </p>
          <p className="bus-chip__label">{bus.label}</p>
        </div>
        {showNextStop && nextStop && (
          <p className="bus-chip__next">
            Next <strong>{nextStop}</strong>
            {eta && <span> · {eta}</span>}
          </p>
        )}
      </div>

      <div className="map-caption">
        <div className="map-legend">
          <span className="map-legend__item">
            <i className="legend-line legend-line--active" aria-hidden="true" /> Active route
          </span>
          <span className="map-legend__item">
            <i className="legend-line legend-line--inactive" aria-hidden="true" /> Other loop
          </span>
          <span className="map-legend__item">
            <i className="legend-dot legend-dot--ram" aria-hidden="true" /> RAM
          </span>
          <span className="map-legend__item">
            <i className="legend-dot legend-dot--billy" aria-hidden="true" /> The Billy
          </span>
        </div>


        <p className="map-caption__billy">
          {info.service ? 'Billy stop today' : 'Billy stop next service'}: <strong>{billyLabel}</strong>
          {billyStop === BILLY_FINALS_STOP ? ' · finals timetable' : ''}
        </p>
        <p className="map-caption__note">
          Select any stop for next departures. Ericksen is request-only · 651-631-5310.
        </p>
      </div>
      <div className={`map-stage map-stage--${show3d ? '3d' : '2d'}`}>
        {show3d ? (
          <SceneBoundary key="scene-3d" onUseFallback={() => setMode('2d')}>
            <Suspense fallback={<div className="map-loading">Loading 3D campus…</div>}>
              <CampusScene bus={bus} selectedStop={selectedStop} onSelectStop={onSelectStop} />
            </Suspense>
          </SceneBoundary>
        ) : (
          <>
            <SvgCampusMap
              bus={bus}
              billyStop={billyStop}
              selectedStop={selectedStop}
              onSelectStop={onSelectStop}
            />
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
                    <strong>Bus</strong> · south of map
                  </span>
                </p>
              )}
            </div>
          </>
        )}
      </div>

    </section>
  );
}
