import { useState } from 'react';
import type { StopId } from '../data/types';
import { RAM_STOP, STOPS, stopShortLabel } from '../data/route';
import { SCHEDULE_SOURCE } from '../data/schedule';
import { departuresForStop, nextVisits, tripWindow } from '../lib/schedule';
import type { ServiceSnapshot } from '../lib/schedule';
import { formatDateKey, formatTime } from '../lib/time';
import { MAX_PINNED_STOPS, togglePinnedStop, useShuttlePrefs } from '../lib/prefs';
import { NextServiceNote } from './NextServiceNote';
import { ScheduleTable, columnsForService } from './ScheduleTable';
import { TimetableList } from './TimetableList';
import '../styles/schedule.css';

interface TodayScheduleProps {
  now: Date;
  info: ServiceSnapshot;
  billyStop: StopId;
  selectedStop: StopId | null;
  onSelectStop: (stop: StopId | null) => void;
}

export function TodaySchedule({
  now,
  info,
  billyStop,
  selectedStop,
  onSelectStop,
}: TodayScheduleProps) {
  const service = info.service;
  const date = formatDateKey(info.clock.dateKey, { weekday: true, year: true });
  const [stopFilter, setStopFilter] = useState<StopId>(RAM_STOP);
  const [showGrid, setShowGrid] = useState(false);
  const prefs = useShuttlePrefs();
  const explorerStop = selectedStop ?? stopFilter;
  const columns = columnsForService(service?.kind ?? 'mwf', billyStop);
  const stopInfo = STOPS[explorerStop];
  const entries = service ? departuresForStop(service, explorerStop) : [];
  const lastEntry = entries[entries.length - 1] ?? null;
  const nextEntry =
    entries.find((entry) => entry.atMinutes * 60 >= info.clock.seconds) ?? null;
  const nextVisit = nextVisits(now, explorerStop, 1)[0] ?? null;
  // Regular Ericksen trips carry no scheduled time; the driver is called instead.
  const implicitEricksenRequest =
    explorerStop === 'erickson' && service !== null && service.kind !== 'finals';
  const requestOnly =
    service !== null &&
    service.trips.some(
      (trip) =>
        trip.times[explorerStop] === undefined &&
        (trip.requestOnly.includes(explorerStop) || implicitEricksenRequest) &&
        tripWindow(trip).last * 60 >= info.clock.seconds,
    );
  const isPinned = prefs.pinnedStops.includes(explorerStop);
  const pinFull = !isPinned && prefs.pinnedStops.length >= MAX_PINNED_STOPS;
  const pinTitle = pinFull
    ? `Unpin a stop first — ${MAX_PINNED_STOPS} pinned stops is the maximum`
    : isPinned
      ? `Remove ${stopInfo.name} from the top of the page`
      : `Pin ${stopInfo.name} to the top of the page`;

  const selectStop = (stop: StopId) => {
    setStopFilter(stop);
    onSelectStop(stop);
  };

  const clearSelection = () => {
    setStopFilter(RAM_STOP);
    onSelectStop(null);
  };

  const billyMoved =
    service?.kind === 'finals' && billyStop !== 'brc-totino' && explorerStop === 'brc-totino';
  const statusNote = nextEntry !== null ? null : !service ? (
    <p className="sched-status__note">
      <strong>No daytime shuttle today.</strong> {info.reason ?? 'No scheduled daytime service.'}{' '}
      Evening shuttle hours are {SCHEDULE_SOURCE.eveningWindow}. Call {SCHEDULE_SOURCE.phone} to
      confirm break or holiday service.
    </p>
  ) : requestOnly ? (
    <p className="sched-status__note">
      <strong>Request only.</strong> No scheduled departure at this stop. Call{' '}
      <a className="sched-status__tel" href="tel:6516315310">
        651-631-5310
      </a>{' '}
      to arrange a pickup.
    </p>
  ) : entries.length === 0 ? (
    <p className="sched-status__note">
      <strong>Not on today&apos;s timetable.</strong> Other stops are still running.
    </p>
  ) : nextEntry === null && nextVisit?.dropOffOnly ? (
    <p className="sched-status__note">
      <strong>Drop-off only.</strong> No more pickups here today. The bus still stops at{' '}
      {formatTime(nextVisit.atMinutes)}.
    </p>
  ) : nextEntry === null ? (
    <p className="sched-status__note">
      <strong>Done for today.</strong>{' '}
      {lastEntry ? `Last departure was ${formatTime(lastEntry.atMinutes)}.` : 'Service has ended.'}
    </p>
  ) : null;
  // Request-only stops have no scheduled trip to roll over to.
  const showNextService = !requestOnly && nextEntry === null && nextVisit === null;

  return (
    <section className="panel sched-board" aria-labelledby="today-title">
      <div className="panel-head sched-board__head">
        <div>
          <p className="eyebrow">Stop &amp; trip explorer</p>
          <h2 id="today-title">Today&apos;s schedule</h2>
          <p className="sched-board__date">{date}</p>
        </div>
        <div className="sched-board__tools">
          <span className={`status-badge status-badge--${info.status}`}>
            <span className="status-badge__dot" aria-hidden="true" />
            {info.status === 'service'
              ? service?.shortLabel ?? 'Service'
              : info.status === 'finals'
                ? 'Finals'
                : 'No service'}
          </span>
          {service && (
            <div className="segmented sched-toggle" role="group" aria-label="Timetable layout">
              <button
                type="button"
                className="segmented__button"
                aria-pressed={!showGrid}
                onClick={() => setShowGrid(false)}
              >
                Trip list
              </button>
              <button
                type="button"
                className="segmented__button"
                aria-pressed={showGrid}
                onClick={() => setShowGrid(true)}
              >
                Full grid
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="sched-stops" role="group" aria-label="Choose a stop">
        {columns.map((column) => (
          <button
            key={column.id}
            type="button"
            className="sched-stop"
            aria-pressed={column.id === explorerStop}
            onClick={() => selectStop(column.id)}
          >
            {column.label}
          </button>
        ))}
      </div>

      <div className="sched-toolbar">
        <div className="sched-toolbar__id">
          <p className="sched-toolbar__stop">{stopInfo.name}</p>
          <p className="sched-toolbar__sub">{stopInfo.subtitle}</p>
        </div>
        <div className="sched-toolbar__actions">
          {explorerStop === 'erickson' && (
            <a className="sched-call-pill" href="tel:6516315310">
              <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                <path
                  d="M5.2 3.5h2.3l1.2 3-1.6 1.3a10 10 0 004.1 4.1l1.3-1.6 3 1.2v2.3a1.7 1.7 0 01-1.9 1.7A12.2 12.2 0 013.5 5.4a1.7 1.7 0 011.7-1.9z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
              Call 651-631-5310
            </a>
          )}
          <button
            type="button"
            className="sched-pin"
            aria-pressed={isPinned}
            disabled={pinFull}
            title={pinTitle}
            aria-label={
              pinFull
                ? pinTitle
                : `${isPinned ? 'Unpin' : 'Pin'} ${stopShortLabel(explorerStop, billyStop)} to the top of the page`
            }
            onClick={() => togglePinnedStop(explorerStop)}
          >
            <svg className="sched-pin__star" viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M10 2.8l2.2 4.5 5 .7-3.6 3.5.9 5L10 14l-4.5 2.5.9-5L2.8 8l5-.7z"
                fill={isPinned ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
            <span>{isPinned ? 'Pinned' : 'Pin to top'}</span>
          </button>
          {selectedStop !== null && (
            <button
              type="button"
              className="sched-clear"
              onClick={clearSelection}
              aria-label="Clear selected stop"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {(statusNote || billyMoved) && (
        <div className="sched-status">
          {statusNote}
          {billyMoved && (
            <p className="sched-status__note">
              <strong>Finals week.</strong> The Billy is at {STOPS[billyStop].name}; this BRC /
              Totino stop keeps its own timetable.
            </p>
          )}
          {showNextService && (
            <NextServiceNote
              now={now}
              stopId={explorerStop}
              label={service ? undefined : 'Next daytime service'}
            />
          )}
        </div>
      )}

      {service &&
        (showGrid ? (
          <>
            <ScheduleTable
              service={service}
              caption={`${service.label} shuttle timetable for ${date}`}
              highlightTripId={nextEntry?.trip.id ?? null}
              billyStop={billyStop}
            />
            <p className="table-hint">Swipe the grid sideways for every stop.</p>
          </>
        ) : (
          <TimetableList service={service} stopId={explorerStop} clockSeconds={info.clock.seconds} />
        ))}
    </section>
  );
}
