import { useEffect, useId, useRef, useState } from 'react';
import { STOPS, STOP_ORDER } from '../data/route';
import type { StopId, Trip } from '../data/types';
import {
  departuresForStop,
  nextDeparture,
  nextDepartures,
  nextService,
  routeForTrip,
  tripWindow,
} from '../lib/schedule';
import type { Departure, NextService, ServiceSnapshot } from '../lib/schedule';
import { formatCountdown, formatDateKey, formatTime } from '../lib/time';
import { useShuttlePrefs } from '../lib/prefs';
import { CallSafety } from './prefs/CallSafety';
import '../styles/prefs.css';

export interface PinnedStopsProps {
  now: Date;
  info: ServiceSnapshot;
  billyStop: StopId;
  selectedStop: StopId | null;
  onSelectStop: (stop: StopId) => void;
  onOpenMyStops: () => void;
}

const ROUTE_LABEL = { via: 'Via Rosedale', bypass: 'Campus loop' } as const;

function routeLabel(trip: Trip): string {
  return ROUTE_LABEL[routeForTrip(trip).id];
}

function spokenEta(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  if (total < 45) return 'departing now';
  const minutes = Math.round(total / 60);
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `in ${hours} hour${hours === 1 ? '' : 's'}${rest ? ` ${rest} minute${rest === 1 ? '' : 's'}` : ''}`;
}

function tripNumber(info: ServiceSnapshot, trip: Trip): number {
  if (!info.service) return 0;
  return info.service.trips.findIndex((candidate) => candidate.id === trip.id) + 1;
}

function nextServiceSentence(now: Date, stopId: StopId): string {
  const next = nextService(now, stopId);
  if (!next) return 'No scheduled service in the next 45 days.';
  const day =
    next.daysAhead === 0 ? 'today' : next.daysAhead === 1 ? 'tomorrow' : formatDateKey(next.dateKey);
  return `Next service ${day} at ${formatTime(next.first.atMinutes)}.`;
}

function hasDropOnlyRemaining(info: ServiceSnapshot, stopId: StopId): boolean {
  if (!info.service) return false;
  return info.service.trips.some(
    (trip) =>
      trip.dropOnly.includes(stopId) &&
      trip.times[stopId] === undefined &&
      tripWindow(trip).last * 60 >= info.clock.seconds,
  );
}

interface PinCardProps {
  stopId: StopId;
  now: Date;
  info: ServiceSnapshot;
  selected: boolean;
  billyStop: StopId;
  onSelect: (stop: StopId) => void;
}

function PinCard({ stopId, now, info, selected, billyStop, onSelect }: PinCardProps) {
  const stop = STOPS[stopId];
  const subName =
    stopId === 'erickson'
      ? stop.name
      : stop.name.startsWith(stop.shortName)
        ? stop.subtitle
        : stop.name;
  const next = nextDeparture(now, stopId);
  const upcoming = nextDepartures(now, stopId, 4);
  const later = upcoming.slice(1);
  const entries = info.service ? departuresForStop(info.service, stopId) : [];
  const lastEntry = entries[entries.length - 1] ?? null;
  const serviceTrips = info.service?.trips.length ?? 0;

  let previousAt: number | null = null;
  let progress = 0;
  if (next) {
    const index = entries.findIndex(
      (entry) => entry.trip.id === next.trip.id && entry.atMinutes === next.atMinutes,
    );
    if (index > 0) {
      previousAt = entries[index - 1].atMinutes;
      const span = next.atMinutes - previousAt;
      if (span > 0) {
        progress = Math.min(
          1,
          Math.max(0, (info.clock.seconds - previousAt * 60) / (span * 60)),
        );
      }
    }
  }

  const soon = next !== null && next.secondsUntil <= 120;
  const trip = next ? tripNumber(info, next.trip) : 0;
  const dropOnly = next === null && hasDropOnlyRemaining(info, stopId);
  const billyElsewhere = stopId === 'graham' && billyStop !== 'graham';

  let big: string;
  let sub: string;
  let note: string | null = null;

  if (next) {
    big = formatCountdown(next.secondsUntil);
    sub = `Departs ${formatTime(next.atMinutes)}`;
  } else if (stopId === 'erickson') {
    big = 'On call';
    sub = 'Request-only pickup';
    note = 'No scheduled time. Arrange a pickup with the driver.';
  } else if (!info.service) {
    big = 'No service';
    sub = info.reason ?? 'No daytime shuttle today.';
    note = nextServiceSentence(now, stopId);
  } else if (billyElsewhere) {
    big = 'Moved';
    sub = `Pickup at ${STOPS[billyStop].name}`;
    note = 'Graham Commons is the finals-week Billy stop.';
  } else if (entries.length === 0) {
    big = 'Not today';
    sub = "This stop is not on today's timetable.";
    note = nextServiceSentence(now, stopId);
  } else {
    big = 'Done';
    sub = lastEntry ? `Last departure ${formatTime(lastEntry.atMinutes)}` : 'Service has ended.';
    note = nextServiceSentence(now, stopId);
  }

  if (dropOnly) {
    note = `${note ? `${note} ` : ''}Remaining trips are drop-off only.`;
  }

  const buttonLabel = next
    ? `${stop.name}. Departs ${formatTime(next.atMinutes)}, ${spokenEta(next.secondsUntil)}. ${
        routeLabel(next.trip)
      }.${selected ? ' Selected on map.' : ''} Select this stop.`
    : `${stop.name}. ${big}. ${sub}.${selected ? ' Selected on map.' : ''} Select this stop.`;

  return (
    <article className="pin-card" data-selected={selected ? 'true' : undefined}>
      <button
        type="button"
        className="pin-card__tap"
        onClick={() => onSelect(stopId)}
        aria-current={selected ? 'true' : undefined}
        aria-label={buttonLabel}
      >
        <span className="pin-card__head">
          <span className="pin-card__title">
            <span className="pin-card__name">{stop.shortName}</span>
            {selected && <span className="pin-card__dot" aria-hidden="true" />}
          </span>
          <span className="pin-card__sub">{subName}</span>
        </span>
        <span
          className={`pin-card__count${soon ? ' is-soon' : ''}${next ? '' : ' pin-card__count--text'}`}
        >
          {big}
        </span>
        <span className="pin-card__scheduled">{sub}</span>
        {next && (
          <span className="pin-card__pills">
            <span className="pin-card__pill">{routeLabel(next.trip)}</span>
            <span className="pin-card__pill pin-card__pill--quiet">
              Trip {trip} of {serviceTrips}
            </span>
          </span>
        )}
      </button>

      <div className="pin-card__foot">
        {next && (
          <>
            <div className="pin-card__progress" aria-hidden="true">
              <span
                className="pin-card__progress-fill"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="pin-card__progress-caption">
              <span>{previousAt !== null ? `Since ${formatTime(previousAt)}` : 'First trip today'}</span>
              <span>Next {formatTime(next.atMinutes)}</span>
            </p>
          </>
        )}

        {later.length > 0 && (
          <details className="pin-card__later">
            <summary className="pin-card__summary">
              <span>Later today</span>
              <span className="pin-card__later-count">{later.length}</span>
              <svg className="pin-card__chevron" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M6 8l4 4 4-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </summary>
            <ul className="pin-card__later-list">
              {later.map((entry) => (
                <li key={entry.trip.id}>{formatTime(entry.atMinutes)}</li>
              ))}
            </ul>
          </details>
        )}

        {note && <p className="pin-card__note">{note}</p>}

        {next && later.length === 0 && (
          <p className="pin-card__note">Last scheduled departure today.</p>
        )}

        {stopId === 'erickson' && <CallSafety compact />}

        {stopId === 'brc-totino' && billyStop !== 'brc-totino' && (
          <p className="pin-card__note">
            During finals, the Billy departs from {STOPS[billyStop].name}.
          </p>
        )}
      </div>
    </article>
  );
}

interface EmptyStopsProps {
  now: Date;
  info: ServiceSnapshot;
  onSelectStop: (stop: StopId) => void;
  onOpenMyStops: () => void;
}

function nextAnywhere(now: Date): { stopId: StopId; departure: Departure } | null {
  let best: { stopId: StopId; departure: Departure } | null = null;
  for (const stopId of STOP_ORDER) {
    const departure = nextDeparture(now, stopId);
    if (!departure) continue;
    if (!best || departure.secondsUntil < best.departure.secondsUntil) {
      best = { stopId, departure };
    }
  }
  return best;
}

function nextServiceAnywhere(now: Date): { stopId: StopId; next: NextService } | null {
  let best: { stopId: StopId; next: NextService } | null = null;
  for (const stopId of STOP_ORDER) {
    const next = nextService(now, stopId);
    if (!next) continue;
    if (!best || next.first.secondsUntil < best.next.first.secondsUntil) {
      best = { stopId, next };
    }
  }
  return best;
}

function EmptyStops({ now, info, onSelectStop, onOpenMyStops }: EmptyStopsProps) {
  const departing = nextAnywhere(now);
  const upcoming = departing ? null : nextServiceAnywhere(now);

  return (
    <div className="pin-empty">
      <div className="pin-empty__head">
        <p className="pin-empty__eyebrow">Next shuttle departing</p>
        <span className="pin-empty__badge">All {STOP_ORDER.length} stops</span>
      </div>

      {departing ? (
        <button
          type="button"
          className="pin-empty__row"
          onClick={() => onSelectStop(departing.stopId)}
          aria-label={`Next shuttle: ${STOPS[departing.stopId].name}, departs ${formatTime(
            departing.departure.atMinutes,
          )}, ${spokenEta(departing.departure.secondsUntil)}. Select this stop.`}
        >
          <span className="pin-empty__text">
            <span className="pin-empty__stop">{STOPS[departing.stopId].name}</span>
            <span className="pin-empty__meta">
              {formatTime(departing.departure.atMinutes)} · {routeLabel(departing.departure.trip)}
            </span>
          </span>
          <span className="pin-empty__count">
            {formatCountdown(departing.departure.secondsUntil)}
          </span>
        </button>
      ) : (
        <div className="pin-empty__off">
          <p className="pin-empty__stop">
            {upcoming ? (info.service ? 'No more departures today' : 'No daytime service today') : 'No scheduled departures'}
          </p>
          {upcoming ? (
            <p className="pin-empty__meta">
              Next service{' '}
              {upcoming.next.daysAhead === 0
                ? 'today'
                : upcoming.next.daysAhead === 1
                  ? 'tomorrow'
                  : formatDateKey(upcoming.next.dateKey)}{' '}
              at {formatTime(upcoming.next.first.atMinutes)} · {STOPS[upcoming.stopId].name}
            </p>
          ) : (
            <p className="pin-empty__meta">Check the published schedule for dates further out.</p>
          )}
          {info.reason && <p className="pin-empty__reason">{info.reason}</p>}
        </div>
      )}

      <p className="pin-empty__hint">
        Published timetable across all {STOP_ORDER.length} stops · no live GPS.
      </p>
      <button type="button" className="pin-empty__cta" onClick={onOpenMyStops}>
        Choose my stops
      </button>
    </div>
  );
}

export function PinnedStops({
  now,
  info,
  billyStop,
  selectedStop,
  onSelectStop,
  onOpenMyStops,
}: PinnedStopsProps) {
  const { pinnedStops } = useShuttlePrefs();
  const headingId = useId();
  const railRef = useRef<HTMLDivElement | null>(null);
  const [activeDot, setActiveDot] = useState(0);

  const count = pinnedStops.length;
  const pinKey = pinnedStops.join(',');
  const showDots = count > 2;
  const activeIndex = Math.min(activeDot, Math.max(0, count - 1));
  const showCallStrip = selectedStop === 'erickson' && !pinnedStops.includes('erickson');

  // A changed pin set replaces the rail, so dot state has to start over with it.
  useEffect(() => {
    setActiveDot(0);
  }, [pinKey]);

  const handleScroll = () => {
    const rail = railRef.current;
    if (!rail) return;
    const railRect = rail.getBoundingClientRect();
    const center = railRect.left + railRect.width / 2;
    let closest = 0;
    let distance = Number.POSITIVE_INFINITY;
    Array.from(rail.children).forEach((child, index) => {
      const rect = child.getBoundingClientRect();
      const offset = Math.abs(rect.left + rect.width / 2 - center);
      if (offset < distance) {
        distance = offset;
        closest = index;
      }
    });
    setActiveDot(closest);
  };

  const scrollToCard = (index: number) => {
    const card = railRef.current?.children[index];
    if (!(card instanceof HTMLElement)) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      inline: 'start',
      block: 'nearest',
    });
  };

  return (
    <section className="pin-section" aria-labelledby={headingId}>
      <header className="pin-head">
        <div className="pin-head__text">
          <p className="pin-head__eyebrow">At a glance</p>
          <h2 className="pin-head__title" id={headingId}>
            {count > 0 ? 'Your stops' : 'Next up'}
          </h2>
        </div>
        <button type="button" className="pin-head__edit" onClick={onOpenMyStops}>
          {count > 0 ? 'Edit stops' : 'My stops'}
        </button>
      </header>

      {count === 0 ? (
        <EmptyStops
          now={now}
          info={info}
          onSelectStop={onSelectStop}
          onOpenMyStops={onOpenMyStops}
        />
      ) : (
        <>
          <div
            ref={railRef}
            className="pin-cards"
            data-count={count}
            onScroll={showDots ? handleScroll : undefined}
          >
            {pinnedStops.map((stopId) => (
              <PinCard
                key={stopId}
                stopId={stopId}
                now={now}
                info={info}
                selected={selectedStop === stopId}
                billyStop={billyStop}
                onSelect={onSelectStop}
              />
            ))}
          </div>
          {showDots && (
            <div className="pin-dots" role="group" aria-label="Pinned stop cards">
              {pinnedStops.map((stopId, index) => (
                <button
                  key={stopId}
                  type="button"
                  className="pin-dot"
                  onClick={() => scrollToCard(index)}
                  aria-label={`Show ${STOPS[stopId].name}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showCallStrip && (
        <div className="pin-call">
          <CallSafety note="Ericksen Center pickups are request only." />
        </div>
      )}
    </section>
  );
}
