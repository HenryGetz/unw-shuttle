import { lazy, Suspense, useState } from 'react';
import type { StopId } from '../data/types';
import { BILLY_FINALS_STOP, STOPS, stopShortLabel } from '../data/route';
import { nextDepartures, nextVisits } from '../lib/schedule';
import type { BusState, ServiceSnapshot } from '../lib/schedule';
import type { CameraPreference, MapViewMode } from '../lib/prefs';
import { formatRelative, formatTime } from '../lib/time';
import { busFocusStop, SCENE_CAMERA_LABEL } from '../scene/contracts';
import { SceneBoundary } from './SceneBoundary';

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
  onClearStop: () => void;
  viewMode: MapViewMode;
  onViewModeChange: (mode: MapViewMode) => void;
  camera: CameraPreference;
  onCameraChange: (camera: CameraPreference) => void;
  resetToken: number;
  onReset: () => void;
  pinnedStops: StopId[];
}

const CAMERAS: CameraPreference[] = ['overview', 'follow'];

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

function prefersFullLabels(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 900px)').matches;
}

const PHASE_LABEL: Record<BusState['phase'], string> = {
  'in-service': 'In service',
  returning: 'Returning',
  parked: 'Parked',
  off: 'Off duty',
};

function MapUnavailable() {
  return (
    <div className="map-fallback" role="status">
      <p className="map-fallback__title">Map unavailable in this browser</p>
      <p className="map-fallback__body">
        The live map needs WebGL. Stop times, the live loop and the full timetable below still work.
      </p>
      <a className="map-fallback__link" href="#today-title">
        View today&apos;s schedule
      </a>
    </div>
  );
}

export function MapPanel({
  now,
  info,
  bus,
  billyStop,
  selectedStop,
  onSelectStop,
  onClearStop,
  viewMode,
  onViewModeChange,
  camera,
  onCameraChange,
  resetToken,
  onReset,
  pinnedStops,
}: MapPanelProps) {
  const [webglSupported] = useState(supportsWebGL);
  const [labelsVisible, setLabelsVisible] = useState(prefersFullLabels);
  const showScene = webglSupported && typeof document !== 'undefined';
  const focusStop = busFocusStop(bus);
  const focusLabel = focusStop ? stopShortLabel(focusStop, billyStop) : null;
  const nextStopLabel = bus.nextStop ? stopShortLabel(bus.nextStop, billyStop) : null;
  const eta =
    bus.secondsToNextStop !== null
      ? bus.secondsToNextStop < 45
        ? '<1m'
        : `${Math.max(1, Math.round(bus.secondsToNextStop / 60))}m`
      : null;
  const rosedale = nextDepartures(now, 'rosedale', 1)[0] ?? null;
  const rosedaleRequestOnly =
    info.service?.trips.some((trip) => trip.requestOnly.includes('rosedale')) ?? false;
  const rosedaleNote = rosedale
    ? `Next departure ${formatTime(rosedale.atMinutes)}.`
    : rosedaleRequestOnly
      ? 'Request only today.'
      : 'No more scheduled departures today.';
  const routeText = bus.route.id === 'via' ? 'Via Rosedale' : 'Campus loop';
  const billyLabel = billyStop === BILLY_FINALS_STOP ? 'Graham' : STOPS[billyStop].shortName;
  const nextRam = nextDepartures(now, 'ramseyer', 1)[0] ?? null;
  const nextRamTime = nextRam ? formatTime(nextRam.atMinutes) : null;
  const ramStopLabel = stopShortLabel('ramseyer', billyStop);
  const primaryText =
    bus.phase === 'in-service'
      ? `En route to ${nextStopLabel ?? 'the next stop'}${eta ? ` · ${eta}` : ''}`
      : bus.phase === 'returning'
        ? `Returning to ${ramStopLabel}`
        : bus.phase === 'parked'
          ? `Parked at ${focusLabel ?? ramStopLabel}${nextRamTime ? ` · Next ${nextRamTime}` : ''}`
          : nextRamTime
            ? `Off duty · Next ${ramStopLabel} ${nextRamTime}`
            : 'Off duty · No daytime service';
  const phaseText = PHASE_LABEL[bus.phase];
  const selected = selectedStop ? STOPS[selectedStop] : null;
  const selectedUpcoming = selectedStop ? nextVisits(now, selectedStop, 3) : [];
  const selectedNext = selectedUpcoming[0] ?? null;
  const selectedRoute = selectedNext
    ? selectedNext.trip.times.rosedale !== undefined
      ? 'Via Rosedale'
      : 'Campus loop'
    : null;
  const selectedRequestOnly =
    selectedStop !== null &&
    (selectedStop === 'erickson' ||
      (info.service?.trips.some((trip) => trip.requestOnly.includes(selectedStop)) ?? false));

  const followShuttle = () => {
    onCameraChange('follow');
  };

  return (
    <section className="map-hero" aria-labelledby="map-title">
      <h2 id="map-title" className="sr-only">
        Campus shuttle map
      </h2>
      <div className={`map-stage map-hero__stage map-hero__stage--${viewMode}`}>
        {showScene ? (
          <div className="map-hero__scene">
            <SceneBoundary>
              <Suspense fallback={<div className="map-loading">Loading campus map…</div>}>
                <CampusScene
                  bus={bus}
                  billyStop={billyStop}
                  selectedStop={selectedStop}
                  pinnedStops={pinnedStops}
                  labelsVisible={labelsVisible}
                  viewMode={viewMode}
                  camera={camera}
                  resetToken={resetToken}
                  onSelectStop={onSelectStop}
                  onCameraChange={onCameraChange}
                />
              </Suspense>
            </SceneBoundary>
          </div>
        ) : (
          <MapUnavailable />
        )}

        {showScene && (
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
          </div>
        )}

        {showScene && selected && selectedStop && (
          <aside className="map-selected" aria-label={`${selected.name} details`}>
            <div className="map-selected__head">
              <div>
                <p className="map-selected__eyebrow">Selected stop</p>
                <h3 className="map-selected__name">
                  {stopShortLabel(selectedStop, billyStop)}
                </h3>
              </div>
              <button
                type="button"
                className="map-selected__close"
                onClick={onClearStop}
                aria-label={`Clear ${selected.name}`}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path
                    d="m4 4 8 8M12 4l-8 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <p className="map-selected__sub">{selected.subtitle}</p>
            {selectedNext ? (
              <>
                <p className="map-selected__next">
                  <strong>{formatTime(selectedNext.atMinutes)}</strong>
                  <span>
                    {selectedNext.dropOffOnly ? 'drops off' : 'arrives'} in{' '}
                    {formatRelative(selectedNext.secondsUntil)}
                  </span>
                </p>
                <p className="map-selected__later">
                  {selectedRoute}
                  {selectedUpcoming.length > 1
                    ? ` · then ${selectedUpcoming
                        .slice(1)
                        .map((departure) => formatTime(departure.atMinutes))
                        .join(', ')}`
                    : ''}
                </p>
              </>
            ) : selectedRequestOnly ? (
              <p className="map-selected__next">
                <strong>On call</strong>
                <span>Request-only pickup</span>
              </p>
            ) : (
              <p className="map-selected__next">
                <strong>{info.service ? 'Done' : 'No service'}</strong>
                <span>{info.service ? 'no more departures today' : 'no daytime shuttle today'}</span>
              </p>
            )}
            {selectedRequestOnly && (
              <a className="map-selected__phone" href="tel:+16516315310">
                Call 651-631-5310 to request
              </a>
            )}
            <a className="map-selected__link" href="#today-title">
              Open in today&apos;s schedule
            </a>
          </aside>
        )}

        {showScene && (
          <>
            <div className="map-hud map-hud--top">
              <button
                type="button"
                className={`map-live map-live--${bus.phase}`}
                onClick={followShuttle}
                aria-label={`${phaseText}${bus.phase === 'off' ? '' : `, ${routeText}`}. ${primaryText}. Follow the shuttle on the map.`}
              >
                <span className="map-live__dot" aria-hidden="true" />
                <span className="map-live__text">
                  <span className="map-live__primary">{primaryText}</span>
                  {bus.phase !== 'off' && <span className="map-live__secondary">{routeText}</span>}
                </span>
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
              </button>

              <div className="map-style" role="group" aria-label="Map projection">
                <button
                  type="button"
                  className="map-style__button"
                  aria-pressed={viewMode === '2d'}
                  onClick={() => onViewModeChange('2d')}
                >
                  2D
                </button>
                <button
                  type="button"
                  className="map-style__button"
                  aria-pressed={viewMode === '3d'}
                  onClick={() => onViewModeChange('3d')}
                >
                  3D
                </button>
              </div>
            </div>

            <div className="map-hud map-hud--bottom">
              <div className="map-camera" role="group" aria-label="Map controls">
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
                <button
                  type="button"
                  className="map-camera__button map-camera__button--labels"
                  aria-pressed={labelsVisible}
                  aria-label="Show every stop label"
                  onClick={() => setLabelsVisible((visible) => !visible)}
                >
                  Labels
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="map-statusline">
        <p>
          {info.service ? 'Billy stop today' : 'Billy stop next service'}:{' '}
          <strong>{billyLabel}</strong>
          {billyStop === BILLY_FINALS_STOP ? ' · finals timetable' : ''}
        </p>
        <p>Simulated from the published timetable · no live GPS</p>
        <p>
          Ericksen request-only · <a href="tel:+16516315310">651-631-5310</a>
        </p>
        <p>
          Map ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            OpenStreetMap
          </a>
        </p>
      </div>
    </section>
  );
}
