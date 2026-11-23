import { useState } from 'react';
import type { StopId } from '../data/types';
import {
  STOPS,
  STOP_ORDER,
  stopShortLabel,
} from '../data/route';
import {
  nextDepartures,
  nextService,
  nextVisits,
  routeForTrip,
  timedStops,
  type BusState,
  type ServiceSnapshot,
} from '../lib/schedule';
import { estimateRide } from '../lib/ride';
import { formatCountdown, formatDateKey, formatRelative, formatTime } from '../lib/time';
import type { ServiceDay, Trip } from '../data/types';

interface GlancePanelProps {
  now: Date;
  info: ServiceSnapshot;
  bus: BusState;
  billyStop: StopId;
  pinnedStops: StopId[];
  onSelectStop: (stop: StopId) => void;
}

const CARD_STOPS = ['ramseyer', 'brc-totino'] as const;

const LOOP_LABEL: Record<StopId, string> = {
  ramseyer: 'RAM',
  akenson: 'Akenson',
  rosedale: 'Rosedale',
  'lower-riley': 'Riley',
  graham: 'Graham',
  'brc-totino': 'Billy',
  erickson: 'Ericksen',
};

const PHASE_LABEL: Record<BusState['phase'], string> = {
  'in-service': 'In service',
  returning: 'Returning',
  parked: 'Parked',
  off: 'Off duty',
};

function nextServiceSentence(now: Date, stopId: StopId): string {
  const next = nextService(now, stopId);
  if (!next) return 'No scheduled service in the next 45 days.';
  const day =
    next.daysAhead === 0
      ? 'today'
      : next.daysAhead === 1
        ? 'tomorrow'
        : formatDateKey(next.dateKey);
  return `Next service ${day} at ${formatTime(next.first.atMinutes)}.`;
}

function tripNumber(service: ServiceDay | null, trip: Trip | null): string | null {
  if (!service || !trip) return null;
  const index = service.trips.findIndex((candidate) => candidate.id === trip.id);
  return index >= 0 ? `Trip ${index + 1} of ${service.trips.length}` : null;
}

function PrimaryCard({
  stopId,
  now,
  info,
  billyStop,
  accent,
  onSelectStop,
}: {
  stopId: StopId;
  now: Date;
  info: ServiceSnapshot;
  billyStop: StopId;
  accent: 'gold' | 'lavender';
  onSelectStop: (stop: StopId) => void;
}) {
  const stop = STOPS[stopId];
  const upcoming = nextVisits(now, stopId, 3);
  const next = upcoming[0] ?? null;
  const route = next ? routeForTrip(next.trip) : null;
  const tripLabel = tripNumber(info.service, next?.trip ?? null);
  const label = stopShortLabel(stopId, billyStop);
  const countdown = next ? formatCountdown(next.secondsUntil) : null;
  const wide = countdown ? countdown.length > 5 : false;

  let stateText = '';
  if (next) {
    stateText = `Departs ${formatTime(next.atMinutes)} · ${formatRelative(next.secondsUntil)}`;
  } else if (!info.service) {
    stateText = nextServiceSentence(now, stopId);
  } else {
    const last = upcoming.length === 0 ? 'No more departures today.' : '';
    stateText = `${last} ${nextServiceSentence(now, stopId)}`.trim();
  }

  return (
    <article className={`glance-card glance-card--${accent}`} data-stop={stopId}>
      <div className="glance-card__top">
        <div className="glance-card__id">
          <span className="glance-card__marker" aria-hidden="true" />
          <div>
            <p className="glance-card__eyebrow">Next bus at</p>
            <h2 className="glance-card__name">{label}</h2>
          </div>
        </div>
        <button
          type="button"
          className="glance-card__locate"
          onClick={() => onSelectStop(stopId)}
          aria-label={`Show ${stop.name} on the map`}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path
              d="M8 14s4.5-4.2 4.5-8a4.5 4.5 0 1 0-9 0c0 3.8 4.5 8 4.5 8Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <circle cx="8" cy="6" r="1.5" fill="currentColor" />
          </svg>
        </button>
      </div>

      <p className="glance-card__full">{stop.name}</p>

      {next ? (
        <>
          <div className="glance-card__count-wrap">
            <span
              className={`glance-card__count${wide ? ' is-wide' : ''}`}
              aria-label={`${formatRelative(next.secondsUntil)} until the next bus`}
            >
              {countdown}
            </span>
            <span className="glance-card__count-unit" aria-hidden="true">
              min : sec
            </span>
          </div>
          <p className="glance-card__state">
            <span className="glance-card__depart">
              {next.dropOffOnly ? 'Drops off' : 'Departs'} {formatTime(next.atMinutes)}
            </span>
            {route && (
              <span className={`glance-card__route glance-card__route--${route.id}`}>
                {route.id === 'via' ? 'Via Rosedale' : 'Campus loop'}
              </span>
            )}
          </p>
          <div className="glance-card__meta">
            {tripLabel && <span>{tripLabel}</span>}
            {upcoming.length > 1 && (
              <span className="glance-card__later">
                Then{' '}
                {upcoming
                  .slice(1)
                  .map((departure) => formatTime(departure.atMinutes))
                  .join(' · ')}
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="glance-card__off">
          <span className="glance-card__off-title">
            {info.service ? 'Done for today' : 'No daytime service'}
          </span>
          <span className="glance-card__off-copy">{stateText}</span>
        </div>
      )}
    </article>
  );
}

function loopStops(
  bus: BusState,
  info: ServiceSnapshot,
): { route: BusState['route']; stops: { id: StopId; at: number | null }[] } {
  const trip = bus.trip ?? info.service?.trips[0] ?? null;
  const route = trip ? routeForTrip(trip) : bus.route;
  if (trip) {
    const timed = timedStops(trip, route, true);
    if (timed.length > 0) {
      return { route, stops: timed.map(({ id, at }) => ({ id, at })) };
    }
  }
  return {
    route,
    stops: STOP_ORDER.filter((id) => route.stopAt[id] !== undefined).map((id) => ({
      id,
      at: null,
    })),
  };
}

function LiveLoop({
  bus,
  info,
  now,
  billyStop,
  onSelectStop,
}: {
  bus: BusState;
  info: ServiceSnapshot;
  now: Date;
  billyStop: StopId;
  onSelectStop: (stop: StopId) => void;
}) {
  const { route, stops } = loopStops(bus, info);
  const seconds = bus.clock.seconds;
  const timed = stops.filter((stop): stop is { id: StopId; at: number } => stop.at !== null);
  const firstAt = timed[0]?.at ?? null;
  const lastAt = timed[timed.length - 1]?.at ?? null;
  const span = firstAt !== null && lastAt !== null ? Math.max(1, lastAt - firstAt) : null;

  let progress = 0;
  if (span !== null && firstAt !== null) {
    if (bus.phase === 'returning') progress = 1;
    else if (bus.phase === 'parked') progress = bus.nextStop ? 0 : 1;
    else if (bus.phase === 'in-service') {
      progress = Math.min(1, Math.max(0, (seconds / 60 - firstAt) / span));
    }
  }
  if (bus.phase === 'off') progress = 0;

  const complete = (at: number | null) =>
    at !== null && (bus.phase === 'returning' || at * 60 <= seconds);
  const nextStop = timed.find((stop) => stop.at * 60 > seconds)?.id ?? null;

  let leg = '';
  if (bus.phase === 'in-service') {
    const to = bus.nextStop ? stopShortLabel(bus.nextStop, billyStop) : 'the next stop';
    const eta =
      bus.secondsToNextStop !== null ? ` · ${formatRelative(bus.secondsToNextStop)}` : '';
    leg = `En route to ${to}${eta}`;
  } else if (bus.phase === 'returning') {
    leg = 'Returning to RAM · no passengers';
  } else if (bus.phase === 'parked') {
    const next = nextDepartures(now, 'ramseyer', 1)[0];
    const at = bus.prevStop ? stopShortLabel(bus.prevStop, billyStop) : 'RAM';
    leg = next
      ? `Parked at ${at} · next RAM departure ${formatTime(next.atMinutes)}`
      : `Parked at ${at} · service finished`;
  } else {
    leg = info.reason ?? 'No daytime service today';
  }

  const routeLabel = route.id === 'via' ? 'Via Rosedale' : 'Campus loop';
  const stateLabel = PHASE_LABEL[bus.phase];

  return (
    <section className="loop" aria-labelledby="live-loop-title">
      <div className="loop__head">
        <h2 className="loop__title" id="live-loop-title">
          Live loop
        </h2>
        <span className={`loop__state loop__state--${bus.phase}`}>
          <span className="loop__pulse" aria-hidden="true" />
          {stateLabel}
        </span>
      </div>
      <p className="loop__leg">{leg}</p>

      <div
        className="loop__rail"
        role="group"
        aria-label={`${routeLabel}. ${leg}. Current positions are simulated from the published timetable.`}
      >
        <div className="loop__track">
          <span className="loop__line" aria-hidden="true" />
          {stops.length > 0 && (
            <span
              className="loop__line loop__line--done"
              style={{ width: `${Math.round(progress * 100)}%` }}
              aria-hidden="true"
            />
          )}
          {bus.phase !== 'off' && (
            <span
              className="loop__bus"
              style={{ left: `${Math.round(progress * 100)}%` }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 16 16" focusable="false">
                <rect
                  x="3"
                  y="2.5"
                  width="10"
                  height="11"
                  rx="2.4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path d="M5 6h6M5 9h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="5.5" cy="12.3" r="1" fill="currentColor" />
                <circle cx="10.5" cy="12.3" r="1" fill="currentColor" />
              </svg>
            </span>
          )}
          <ol className="loop__stops">
            {stops.map((stop, index) => {
              const done = complete(stop.at);
              const isNext = stop.id === nextStop;
              const position =
                stop.at !== null && span
                  ? ((stop.at - (firstAt ?? 0)) / span) * 100
                  : stops.length > 1
                    ? (index / (stops.length - 1)) * 100
                    : 0;
              return (
                <li
                  key={stop.id}
                  className={`loop__stop${done ? ' is-done' : ''}${isNext ? ' is-next' : ''}`}
                  style={{ left: `${Math.round(position)}%` }}
                >
                  <button
                    type="button"
                    className="loop__stop-button"
                    onClick={() => onSelectStop(stop.id)}
                    aria-label={`${STOPS[stop.id].name}${
                      stop.at !== null
                        ? `, scheduled ${formatTime(stop.at)}`
                        : ', no scheduled time'
                    }. Show on map.`}
                  >
                    <span className="loop__dot" aria-hidden="true" />
                    <span className="loop__name">{LOOP_LABEL[stop.id]}</span>
                    {stop.at !== null && <span className="loop__time">{formatTime(stop.at)}</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

function RideEstimator({
  now,
  billyStop,
  pinnedStops,
}: {
  now: Date;
  billyStop: StopId;
  pinnedStops: StopId[];
}) {
  const first = pinnedStops[0] ?? 'ramseyer';
  const second =
    pinnedStops.find((id) => id !== first) ??
    (first === 'ramseyer' ? billyStop : 'ramseyer');
  const [from, setFrom] = useState<StopId>(first);
  const [to, setTo] = useState<StopId>(second);
  const estimate = estimateRide(now, from, to);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const scheduled =
    estimate.status === 'scheduled' && estimate.departureMinutes !== null && estimate.arrivalMinutes !== null;

  return (
    <section className="ride" aria-labelledby="ride-title">
      <div className="ride__head">
        <h2 className="ride__title" id="ride-title">
          Ride estimate
        </h2>
        <span className="ride__hint">From published times</span>
      </div>
      <div className="ride__form">
        <label className="ride__field">
          <span className="ride__label">From</span>
          <select
            value={from}
            onChange={(event) => setFrom(event.target.value as StopId)}
            aria-label="Starting stop"
          >
            {STOP_ORDER.map((id) => (
              <option key={id} value={id}>
                {stopShortLabel(id, billyStop)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="ride__swap" onClick={swap} aria-label="Swap origin and destination">
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path
              d="M5 6h9m-2.5-2.5L14 6l-2.5 2.5M15 14H6m2.5 2.5L6 14l2.5-2.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <label className="ride__field">
          <span className="ride__label">To</span>
          <select
            value={to}
            onChange={(event) => setTo(event.target.value as StopId)}
            aria-label="Destination stop"
          >
            {STOP_ORDER.map((id) => (
              <option key={id} value={id}>
                {stopShortLabel(id, billyStop)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={`ride__result ride__result--${estimate.status}`}>
        {scheduled ? (
          <>
            <span className="ride__times">
              <strong>{formatTime(estimate.departureMinutes!)}</strong>
              <span className="ride__arrow" aria-hidden="true">
                →
              </span>
              <strong>{formatTime(estimate.arrivalMinutes!)}</strong>
            </span>
            <span className="ride__meta">
              ~{estimate.durationMinutes} min · leaves {formatRelative(estimate.secondsUntil ?? 0)}
            </span>
          </>
        ) : (
          <span className="ride__note">{estimate.note}</span>
        )}
      </div>
    </section>
  );
}

export function GlancePanel({
  now,
  info,
  bus,
  billyStop,
  pinnedStops,
  onSelectStop,
}: GlancePanelProps) {
  return (
    <section className="glance" aria-labelledby="glance-title">
      <header className="glance__head">
        <div>
          <p className="glance__eyebrow">Campus shuttle · live simulation</p>
          <h1 className="glance__title" id="glance-title">
            Next shuttle
          </h1>
        </div>
      </header>
      <p className="glance__sub">
        {formatDateKey(info.clock.dateKey)} · times are
        <span className="glance__tz"> America/Chicago</span>
      </p>

      <div className="glance__cards">
        <PrimaryCard
          stopId={CARD_STOPS[0]}
          now={now}
          info={info}
          billyStop={billyStop}
          accent="gold"
          onSelectStop={onSelectStop}
        />
        <PrimaryCard
          stopId={billyStop}
          now={now}
          info={info}
          billyStop={billyStop}
          accent="lavender"
          onSelectStop={onSelectStop}
        />
      </div>

      <LiveLoop bus={bus} info={info} now={now} billyStop={billyStop} onSelectStop={onSelectStop} />
      <RideEstimator
        key={pinnedStops.join(',')}
        now={now}
        billyStop={billyStop}
        pinnedStops={pinnedStops}
      />
    </section>
  );
}
