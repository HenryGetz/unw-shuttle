import type { StopId } from '../data/types';
import { RAM_STOP, STOPS } from '../data/route';
import { SCHEDULE_SOURCE } from '../data/schedule';
import { nextDeparture } from '../lib/schedule';
import type { ServiceSnapshot } from '../lib/schedule';
import { formatDateKey, formatTime } from '../lib/time';
import { NextServiceNote } from './NextServiceNote';
import { ScheduleTable } from './ScheduleTable';

interface TodayScheduleProps {
  now: Date;
  info: ServiceSnapshot;
  selectedStop: StopId | null;
}

export function TodaySchedule({ now, info, selectedStop }: TodayScheduleProps) {
  const service = info.service;
  const date = formatDateKey(info.clock.dateKey, { weekday: true, year: true });
  const highlightStop =
    service && selectedStop && service.trips.some((trip) => trip.times[selectedStop] !== undefined)
      ? selectedStop
      : RAM_STOP;
  const next = service
    ? nextDeparture(now, highlightStop) ?? nextDeparture(now, RAM_STOP)
    : null;

  return (
    <section className="panel schedule-panel" aria-labelledby="today-title">
      <div className="panel-head schedule-panel__head">
        <div>
          <p className="eyebrow">Timetable</p>
          <h2 id="today-title">Today&apos;s schedule</h2>
          <p className="schedule-panel__date">{date}</p>
        </div>
        <span className={`status-badge status-badge--${info.status}`}>
          <span className="status-badge__dot" aria-hidden="true" />
          {info.status === 'service'
            ? service?.shortLabel ?? 'Service'
            : info.status === 'finals'
              ? 'Finals'
              : 'No service'}
        </span>
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
          <div className="schedule-summary">
            <p className="schedule-summary__badge">
              {service.label} <span>· {service.trips.length} trips</span>
            </p>
            <p className="schedule-summary__next">
              {next ? (
                <>
                  Next <strong>{formatTime(next.atMinutes)}</strong> at {STOPS[next.stopId].shortName}
                </>
              ) : (
                'No more departures today'
              )}
            </p>
          </div>

          <ScheduleTable
            service={service}
            caption={`${service.label} shuttle timetable for ${date}`}
            highlightTripId={next?.trip.id ?? null}
          />

          <p className="table-hint">Scroll the table sideways to see every stop.</p>

          <div className="schedule-notes">
            <p className="schedule-notes__title">Good to know</p>
            <ul>
              <li>No Wilson Center stop appears on any published timetable.</li>
              <li>Ericksen Center is request-only. Call 651-631-5310 for a pickup.</li>
              <li>Public Safety says the shuttle does not run during chapel; the published table still lists mid-morning trips.</li>
              <li>The finals PDF is from Spring 2024. Its 11:00 PM row is corrected to 11:00 AM here.</li>
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
