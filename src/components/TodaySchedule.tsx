import { useEffect, useState } from 'react';
import type { StopId } from '../data/types';
import { RAM_STOP, STOPS } from '../data/route';
import { SCHEDULE_SOURCE } from '../data/schedule';
import { nextDeparture } from '../lib/schedule';
import type { ServiceSnapshot } from '../lib/schedule';
import { formatDateKey, formatTime } from '../lib/time';
import { NextServiceNote } from './NextServiceNote';
import { ScheduleTable, columnsForService } from './ScheduleTable';
import { TimetableList } from './TimetableList';
import '../styles/schedule.css';

interface TodayScheduleProps {
  now: Date;
  info: ServiceSnapshot;
  selectedStop: StopId | null;
  onSelectStop: (stop: StopId) => void;
}

const WIDE_TIMETABLE = '(min-width: 900px)';

function useWideTimetable(): boolean {
  const [wide, setWide] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(WIDE_TIMETABLE).matches,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(WIDE_TIMETABLE);
    const onChange = () => setWide(media.matches);
    setWide(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return wide;
}

export function TodaySchedule({ now, info, selectedStop, onSelectStop }: TodayScheduleProps) {
  const service = info.service;
  const date = formatDateKey(info.clock.dateKey, { weekday: true, year: true });
  const [stopFilter, setStopFilter] = useState<StopId>(RAM_STOP);
  const [layoutChoice, setLayoutChoice] = useState<boolean | null>(null);
  const wide = useWideTimetable();
  const showGrid = layoutChoice ?? wide;
  const columns = service ? columnsForService(service.kind) : [];
  const listedStop =
    selectedStop !== null && columns.some((column) => column.id === selectedStop)
      ? selectedStop
      : stopFilter;
  const highlightStop =
    service && selectedStop && service.trips.some((trip) => trip.times[selectedStop] !== undefined)
      ? selectedStop
      : RAM_STOP;
  const next = service
    ? nextDeparture(now, highlightStop) ?? nextDeparture(now, RAM_STOP)
    : null;

  const selectStop = (stop: StopId) => {
    setStopFilter(stop);
    onSelectStop(stop);
  };

  return (
    <section className="panel sched-board" aria-labelledby="today-title">
      <div className="panel-head sched-board__head">
        <div>
          <p className="eyebrow">Timetable</p>
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
                onClick={() => setLayoutChoice(false)}
              >
                Trip list
              </button>
              <button
                type="button"
                className="segmented__button"
                aria-pressed={showGrid}
                onClick={() => setLayoutChoice(true)}
              >
                Full grid
              </button>
            </div>
          )}
        </div>
      </div>

      {!service ? (
        <div className="empty-state">
          <p className="empty-state__title">No daytime shuttle today</p>
          <p className="empty-state__reason">{info.reason ?? 'No scheduled daytime service.'}</p>
          <p className="empty-state__body">
            Evening shuttle hours are {SCHEDULE_SOURCE.eveningWindow}. Call {SCHEDULE_SOURCE.phone} to
            confirm break or holiday service.
          </p>
          <NextServiceNote now={now} stopId={RAM_STOP} label="Next daytime service" />
        </div>
      ) : (
        <>
          <div className="sched-summary">
            <p className="sched-summary__badge">
              {service.label} <span>· {service.trips.length} trips</span>
            </p>
            <p className="sched-summary__next">
              {next ? (
                <>
                  Next <strong>{formatTime(next.atMinutes)}</strong> at {STOPS[next.stopId].shortName}
                </>
              ) : (
                'No more departures today'
              )}
            </p>
          </div>

          {!showGrid && (
            <div className="sched-stops" role="group" aria-label="Filter trips by stop">
              {columns.map((column) => (
                <button
                  key={column.id}
                  type="button"
                  className="sched-stop"
                  aria-pressed={column.id === listedStop}
                  onClick={() => selectStop(column.id)}
                >
                  {column.label}
                </button>
              ))}
            </div>
          )}

          {showGrid ? (
            <>
              <ScheduleTable
                service={service}
                caption={`${service.label} shuttle timetable for ${date}`}
                highlightTripId={next?.trip.id ?? null}
              />
              <p className="table-hint">Swipe the grid sideways for every stop.</p>
            </>
          ) : (
            <TimetableList
              service={service}
              stopId={listedStop}
              clockSeconds={info.clock.seconds}
            />
          )}
        </>
      )}
    </section>
  );
}
