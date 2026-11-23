import type { ServiceDay, ServiceKind, StopId, Trip } from '../data/types';
import { BILLY_FINALS_STOP, BILLY_REGULAR_STOP, STOPS, STOP_ORDER, stopShortLabel } from '../data/route';
import { routeForTrip, tripWindow } from '../lib/schedule';
import { formatRelative, formatTime } from '../lib/time';

interface TimetableListProps {
  service: ServiceDay;
  stopId: StopId;
  clockSeconds: number;
}

type RowKind = 'time' | 'request' | 'drop';

interface Row {
  trip: Trip;
  index: number;
  kind: RowKind;
  atMinutes: number | null;
  request: boolean;
  sortMinutes: number;
}

interface TripStopRow {
  id: StopId;
  label: string;
}

function buildRows(service: ServiceDay, stopId: StopId): Row[] {
  const implicitEricksen = stopId === 'erickson' && service.kind !== 'finals';
  const rows: Row[] = [];

  service.trips.forEach((trip, index) => {
    const at = trip.times[stopId];
    if (at !== undefined) {
      rows.push({
        trip,
        index,
        kind: 'time',
        atMinutes: at,
        request: trip.requestOnly.includes(stopId),
        sortMinutes: at,
      });
      return;
    }
    if (trip.dropOnly.includes(stopId)) {
      const dropAt = trip.dropAt?.[stopId] ?? null;
      rows.push({
        trip,
        index,
        kind: 'drop',
        atMinutes: dropAt,
        request: false,
        sortMinutes: dropAt ?? tripWindow(trip).first,
      });
      return;
    }
    if (trip.requestOnly.includes(stopId) || implicitEricksen) {
      rows.push({
        trip,
        index,
        kind: 'request',
        atMinutes: null,
        request: true,
        sortMinutes: tripWindow(trip).first,
      });
    }
  });

  return rows.sort((a, b) => a.sortMinutes - b.sortMinutes);
}

function tripStops(trip: Trip, kind: ServiceKind): TripStopRow[] {
  const entries = STOP_ORDER.flatMap((id) => {
    const at = trip.times[id];
    if (at !== undefined) {
      return [{ id, at, label: formatTime(at) }];
    }
    if (trip.dropOnly.includes(id)) {
      const dropAt = trip.dropAt?.[id];
      return [{ id, at: dropAt ?? null, label: dropAt === undefined ? 'Drop' : `~${formatTime(dropAt)}` }];
    }
    if (trip.requestOnly.includes(id) || (id === 'erickson' && kind !== 'finals')) {
      return [{ id, at: null, label: 'Request' }];
    }
    return [];
  });
  return entries
    .sort((a, b) => (a.at ?? 24 * 60) - (b.at ?? 24 * 60))
    .map(({ id, label }) => ({ id, label }));
}

export function TimetableList({ service, stopId, clockSeconds }: TimetableListProps) {
  const billyStop = service.kind === 'finals' ? BILLY_FINALS_STOP : BILLY_REGULAR_STOP;
  const rows = buildRows(service, stopId);
  const decorated = rows.map((row) => {
    const isPast =
      row.atMinutes !== null
        ? row.atMinutes * 60 < clockSeconds
        : tripWindow(row.trip).last * 60 < clockSeconds;
    const isNext = row.atMinutes !== null && row.atMinutes * 60 >= clockSeconds;
    return { ...row, isPast, isNext };
  });

  const nextRow = decorated.find((row) => row.isNext);
  if (nextRow) {
    for (const row of decorated) row.isNext = row === nextRow;
  }
  const showPhone = stopId !== 'erickson' && decorated.some((row) => row.request);
  const stopName = STOPS[stopId].name;

  if (decorated.length === 0) {
    return (
      <p className="trip-list__empty">
        {stopName} is not on today&apos;s timetable. Other stops are still running.
      </p>
    );
  }

  return (
    <div className="trip-list-wrap">
      <p className="trip-list__count">
        {decorated.length} {decorated.length === 1 ? 'trip' : 'trips'} today
      </p>
      <ul className="trip-list">
        {decorated.map((row) => {
          const route = routeForTrip(row.trip);
          const time =
            row.kind === 'drop'
              ? row.atMinutes === null
                ? 'Drop'
                : `~${formatTime(row.atMinutes)}`
              : row.atMinutes === null
                ? 'Req'
                : formatTime(row.atMinutes);
          const routeLabel = route.id === 'via' ? 'Via Rosedale' : 'Campus loop';
          const badges = [
            row.kind === 'request' || row.request ? 'Request only' : null,
            row.kind === 'drop' ? 'Drop-off only' : null,
            row.isNext ? 'Next departure' : null,
          ].filter((badge): badge is string => badge !== null);
          const classes = [
            'trip-row',
            row.isPast ? 'is-past' : '',
            row.isNext ? 'is-next' : '',
          ]
            .filter(Boolean)
            .join(' ');
          const countdown =
            row.isNext && row.atMinutes !== null
              ? `in ${formatRelative(row.atMinutes * 60 - clockSeconds)}`
              : null;

          return (
            <li key={row.trip.id}>
              <details className={classes}>
                <summary
                  className="trip-row__summary"
                  aria-label={[`Trip ${row.index + 1} of ${service.trips.length}`, time, ...(countdown ? [countdown] : []), routeLabel, ...badges].join('. ')}
                >
                  <span className="trip-row__time">
                    {time}
                    {countdown && <span className="trip-row__countdown">{countdown}</span>}
                  </span>
                  <span className="trip-row__body">
                    <span className="trip-row__title">Trip {row.index + 1}</span>
                    <span className="trip-row__meta">
                      {(row.kind === 'request' || row.request) && (
                        <span className="trip-tag trip-tag--req">Request only</span>
                      )}
                      {row.kind === 'drop' && (
                        <span className="trip-tag trip-tag--drop">Drop-off only</span>
                      )}
                      {row.isNext && <span className="trip-tag trip-tag--next">Next</span>}
                    </span>
                  </span>
                  <svg
                    className="trip-row__chevron"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="m4 6 4 4 4-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </summary>
                <div className="trip-row__detail">
                  <p className="trip-route">
                    <span className={`trip-tag trip-tag--${route.id}`}>{routeLabel}</span>
                  </p>
                  <ol className="trip-stops">
                    {tripStops(row.trip, service.kind).map((stop) => (
                      <li key={stop.id}>
                        <span className="trip-stops__name">{stopShortLabel(stop.id, billyStop)}</span>
                        <span className="trip-stops__time">{stop.label}</span>
                      </li>
                    ))}
                  </ol>
                  {row.trip.note && <p className="trip-note">{row.trip.note}</p>}
                  {row.kind === 'request' && (
                    <p className="trip-note">
                      No scheduled departure at this stop. Call 651-631-5310 to request a pickup.
                    </p>
                  )}
                  {row.kind === 'drop' && (
                    <p className="trip-note">
                      Drop-off only. This trip does not pick up passengers at this stop.
                    </p>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
      {showPhone && (
        <a className="sched-call" href="tel:6516315310">
          <span>
            <span className="sched-call__label">Request stop pickup</span>
            Call the driver · Public Safety
          </span>
          <span className="sched-call__number">651-631-5310</span>
        </a>
      )}
    </div>
  );
}
