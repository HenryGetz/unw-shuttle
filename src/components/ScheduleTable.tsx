import type { ServiceDay, ServiceKind, StopId, Trip } from '../data/types';
import { BILLY_FINALS_STOP, BILLY_REGULAR_STOP, stopShortLabel } from '../data/route';
import { routeForTrip } from '../lib/schedule';
import { formatTime } from '../lib/time';
import '../styles/schedule.css';

export interface ScheduleColumn {
  id: StopId;
  label: string;
}

const REGULAR_STOP_IDS: StopId[] = [
  'ramseyer',
  'akenson',
  'rosedale',
  'lower-riley',
  'brc-totino',
  'erickson',
];

const FINALS_STOP_IDS: StopId[] = [
  'ramseyer',
  'akenson',
  'rosedale',
  'graham',
  'brc-totino',
  'erickson',
];

const SHORT_HEADER: Record<StopId, string> = {
  ramseyer: 'RAM',
  akenson: 'Ake',
  rosedale: 'Ros',
  'lower-riley': 'Riley',
  graham: 'Graham',
  'brc-totino': 'BRC',
  erickson: 'Erick',
};

export function columnsForService(kind: ServiceKind, billyStop?: StopId): ScheduleColumn[] {
  const resolvedBilly =
    billyStop ?? (kind === 'finals' ? BILLY_FINALS_STOP : BILLY_REGULAR_STOP);
  // Only the day's Billy stop prints "Billy"; the other Billy-related stop keeps its own name.
  return (kind === 'finals' ? FINALS_STOP_IDS : REGULAR_STOP_IDS).map((id) => ({
    id,
    label: stopShortLabel(id, resolvedBilly) === 'The Billy' ? 'Billy' : SHORT_HEADER[id],
  }));
}

interface ScheduleTableProps {
  service: ServiceDay;
  caption: string;
  highlightTripId?: string | null;
  billyStop?: StopId;
}

function renderCell(trip: Trip, stopId: StopId, kind: ServiceKind) {
  const at = trip.times[stopId];
  if (at !== undefined) {
    return (
      <span className="cell-stack">
        <span className="time">{formatTime(at)}</span>
        {trip.requestOnly.includes(stopId) && (
          <span className="cell-badge cell-badge--req" title="Request only">
            Req
          </span>
        )}
      </span>
    );
  }
  if (trip.dropOnly.includes(stopId)) {
    return (
      <span className="cell-badge cell-badge--drop" title="Drop-off only">
        Drop
      </span>
    );
  }
  if (trip.requestOnly.includes(stopId)) {
    return (
      <span className="cell-badge cell-badge--req" title="Request only">
        Req
      </span>
    );
  }
  if (kind !== 'finals' && stopId === 'erickson') {
    return (
      <span className="cell-badge cell-badge--req" title="Request only with the driver">
        Req
      </span>
    );
  }
  return (
    <span className="table-dash" aria-label="No stop">
      —
    </span>
  );
}

export function ScheduleTable({
  service,
  caption,
  highlightTripId = null,
  billyStop,
}: ScheduleTableProps) {
  const columns = columnsForService(service.kind, billyStop);
  const notes = service.trips.flatMap((trip, index) =>
    trip.note ? [{ id: trip.id, text: `Trip ${index + 1}: ${trip.note}` }] : [],
  );

  return (
    <div className="schedule-table sched-grid">
      <div className="sched-grid__scroll table-wrap">
        <table className="sched-grid__table">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className="trip-col">
                #
              </th>
              {columns.map((column) => (
                <th scope="col" key={column.id}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {service.trips.map((trip, index) => {
              const route = routeForTrip(trip);
              const isNext = highlightTripId === trip.id;
              return (
                <tr key={trip.id} className={isNext ? 'is-next' : undefined}>
                  <th scope="row" className="trip-col">
                    <span className="trip-number">{index + 1}</span>
                    <span
                      className={`route-mark route-mark--${route.id}`}
                      aria-hidden="true"
                      title={route.id === 'via' ? 'Via Rosedale' : 'Campus loop'}
                    />
                    <span className="sr-only">
                      {route.id === 'via' ? 'Via Rosedale' : 'Campus loop'}
                    </span>
                    {isNext && <span className="next-flag">Next</span>}
                  </th>
                  {columns.map((column) => (
                    <td key={column.id} className={column.id === 'ramseyer' ? 'cell-ram' : undefined}>
                      {renderCell(trip, column.id, service.kind)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <span className="sched-grid__fade sched-grid__fade--start" aria-hidden="true" />
      <span className="sched-grid__fade sched-grid__fade--end" aria-hidden="true" />
      {notes.length > 0 && (
        <ul className="table-notes">
          {notes.map((note) => (
            <li key={note.id}>{note.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
