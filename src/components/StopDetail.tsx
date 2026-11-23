import type { StopId, Trip } from '../data/types';
import { STOPS, STOP_ORDER, stopShortLabel } from '../data/route';
import { departuresForStop, routeForTrip, tripWindow } from '../lib/schedule';
import type { ServiceSnapshot } from '../lib/schedule';
import { formatDateKey, formatTime } from '../lib/time';
import { NextServiceNote } from './NextServiceNote';

interface StopDetailProps {
  now: Date;
  info: ServiceSnapshot;
  stop: StopId | null;
  billyStop: StopId;
  onClear: () => void;
  onSelect: (stop: StopId) => void;
}

interface StopRow {
  key: string;
  trip: Trip;
  atMinutes: number | null;
  kind: 'time' | 'request';
}

export function StopDetail({ now, info, stop, billyStop, onClear, onSelect }: StopDetailProps) {
  if (stop === null) {
    return (
      <section className="panel stop-detail" aria-labelledby="stop-detail-title">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Stop explorer</p>
            <h2 id="stop-detail-title">Choose a stop</h2>
          </div>
        </div>
        <p className="muted">
          Tap a marker on the map or pick a stop below to see the next three departures.
        </p>
        <div className="stop-chips">
          {STOP_ORDER.map((stopId) => (
            <button key={stopId} type="button" className="stop-chip" onClick={() => onSelect(stopId)}>
              {stopShortLabel(stopId, billyStop)}
            </button>
          ))}
        </div>
      </section>
    );
  }

  const stopInfo = STOPS[stop];
  const service = info.service;
  const entries = service ? departuresForStop(service, stop) : [];
  const upcoming = entries.filter((entry) => entry.atMinutes * 60 >= info.clock.seconds);
  const lastEntry = entries[entries.length - 1] ?? null;
  const tripNumber = (trip: Trip) =>
    service ? service.trips.findIndex((candidate) => candidate.id === trip.id) + 1 : 0;

  const timedRows: StopRow[] = upcoming.slice(0, 3).map(({ trip, atMinutes }) => ({
    key: `${trip.id}-time`,
    trip,
    atMinutes,
    kind: 'time',
  }));
  // Regular Ericksen trips carry no scheduled time at all; the driver is called instead.
  const implicitEricksenRequest = stop === 'erickson' && service !== null && service.kind !== 'finals';
  const requestRows: StopRow[] = service
    ? service.trips
        .filter(
          (trip) =>
            trip.times[stop] === undefined &&
            (trip.requestOnly.includes(stop) || implicitEricksenRequest) &&
            tripWindow(trip).last * 60 >= info.clock.seconds,
        )
        .map((trip) => ({
          key: `${trip.id}-request`,
          trip,
          atMinutes: null,
          kind: 'request' as const,
        }))
    : [];

  const rows = [...timedRows, ...requestRows]
    .sort(
      (a, b) =>
        (a.atMinutes ?? tripWindow(a.trip).first) - (b.atMinutes ?? tripWindow(b.trip).first),
    )
    .slice(0, 3);

  const dropTrips = service
    ? service.trips.filter(
        (trip) =>
          trip.dropOnly.includes(stop) && tripWindow(trip).last * 60 >= info.clock.seconds,
      )
    : [];
  const requestOnlyNoSchedule = implicitEricksenRequest;
  const showPhone = stop === 'erickson' || requestRows.length > 0;
  const showEmpty = service !== null && rows.length === 0 && !requestOnlyNoSchedule;

  return (
    <section className="panel stop-detail stop-detail--selected" aria-labelledby="stop-detail-title">
      <header className="panel-head stop-detail__head">
        <div>
          <p className="eyebrow">Stop explorer</p>
          <h2 id="stop-detail-title">{stopInfo.name}</h2>
          <p className="stop-detail__sub">{stopInfo.subtitle}</p>
        </div>
        <button type="button" className="clear-button" onClick={onClear} aria-label="Clear selected stop">
          Clear <span aria-hidden="true">×</span>
        </button>
      </header>

      <p className="stop-detail__context">
        {formatDateKey(info.clock.dateKey, { weekday: true })} ·{' '}
        {info.service?.shortLabel ?? 'No daytime service'}
      </p>

      {!service ? (
        <div className="detail-state">
          <p className="detail-state__title">No service today</p>
          <p className="detail-state__reason">{info.reason ?? 'No daytime shuttle today.'}</p>
          <NextServiceNote now={now} stopId={stop} />
        </div>
      ) : (
        <>
          {rows.length > 0 && (
            <ol className="departure-list">
              {rows.map((row) => {
                const route = routeForTrip(row.trip);
                return (
                  <li key={row.key} className={`departure departure--${row.kind}`}>
                    <span className="departure__time">
                      {row.atMinutes === null ? 'Req' : formatTime(row.atMinutes)}
                    </span>
                    <span className="departure__main">
                      <span className="departure__trip">
                        Trip {tripNumber(row.trip)} of {service.trips.length}
                      </span>
                      <span className="departure__meta">
                        {row.kind === 'request'
                          ? 'Request only · no scheduled time'
                          : route.id === 'via'
                            ? 'Via Rosedale'
                            : 'Campus loop'}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          {requestOnlyNoSchedule && (
            <div className="request-block">
              <p className="request-block__title">Request only</p>
              <p className="request-block__body">
                Ericksen Center has no scheduled departure. Call the driver to arrange a pickup on a
                campus-loop trip.
              </p>
            </div>
          )}

          {showEmpty && (
            <div className="detail-state">
              <p className="detail-state__title">
                {entries.length > 0 ? 'Done for today' : 'No departures today'}
              </p>
              <p className="detail-state__reason">
                {entries.length > 0 && lastEntry
                  ? `Last departure was ${formatTime(lastEntry.atMinutes)}.`
                  : "This stop is not on today's timetable."}
              </p>
              <NextServiceNote now={now} stopId={stop} />
            </div>
          )}

          {showPhone && (
            <a className="call-card" href="tel:+16516315310">
              <span className="call-card__label">Request only · Call the driver</span>
              <span className="call-card__number">651-631-5310</span>
            </a>
          )}

          {dropTrips.length > 0 && (
            <ul className="detail-notes">
              {dropTrips.map((trip) => (
                <li key={trip.id}>
                  Trip {tripNumber(trip)} is drop-off only at this stop.
                </li>
              ))}
            </ul>
          )}

          {stop === 'graham' && billyStop !== 'graham' && (
            <p className="detail-note">
              Outside finals week, The Billy departs from BRC / Totino.
            </p>
          )}
        </>
      )}
    </section>
  );
}
