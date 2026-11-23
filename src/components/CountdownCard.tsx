import type { StopId } from '../data/types';
import { departuresForStop, nextDeparture, nextDepartures, routeForTrip } from '../lib/schedule';
import type { ServiceSnapshot } from '../lib/schedule';
import { formatCountdown, formatTime } from '../lib/time';
import { NextServiceNote } from './NextServiceNote';

interface CountdownCardProps {
  now: Date;
  info: ServiceSnapshot;
  stopId: StopId;
  title: string;
  kicker: string;
  subtitle: string;
  tone: 'ram' | 'billy';
}

function CountdownDigits({ value }: { value: string }) {
  return (
    <span className="countdown__digits">
      {Array.from(value).map((character, index) =>
        character === ':' ? (
          <span className="countdown__colon" key={`colon-${index}`}>
            :
          </span>
        ) : (
          <span className="countdown__digit" key={`digit-${index}`}>
            {character}
          </span>
        ),
      )}
    </span>
  );
}

function spokenCountdown(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} minute${minutes === 1 ? '' : 's'}`;
  if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'} ${secs} second${secs === 1 ? '' : 's'}`;
  return `${secs} second${secs === 1 ? '' : 's'}`;
}

export function CountdownCard({ now, info, stopId, title, kicker, subtitle, tone }: CountdownCardProps) {
  const service = info.service;
  const departure = nextDeparture(now, stopId);
  const upcoming = nextDepartures(now, stopId, 3);
  const later = upcoming.slice(1);
  const entries = service ? departuresForStop(service, stopId) : [];
  const lastEntry = entries[entries.length - 1] ?? null;
  const titleId = `countdown-${tone}`;

  const tripIndex =
    service && departure ? service.trips.findIndex((trip) => trip.id === departure.trip.id) + 1 : 0;
  const totalTrips = service?.trips.length ?? 0;

  let previousAt: number | null = null;
  let progress = 0;
  if (service && departure) {
    const nextIndex = entries.findIndex(
      (entry) => entry.trip.id === departure.trip.id && entry.atMinutes === departure.atMinutes,
    );
    if (nextIndex > 0) {
      previousAt = entries[nextIndex - 1].atMinutes;
      const span = departure.atMinutes - previousAt;
      if (span > 0) {
        progress = Math.min(
          1,
          Math.max(0, (info.clock.seconds - previousAt * 60) / (span * 60)),
        );
      }
    }
  }

  const route = departure ? routeForTrip(departure.trip) : null;
  const routeLabel = route ? (route.id === 'via' ? 'Via Rosedale' : 'Campus loop') : '';
  const requestOnly = service?.trips.some((trip) => trip.requestOnly.includes(stopId)) ?? false;
  const tripNumber = (tripId: string) =>
    service ? service.trips.findIndex((trip) => trip.id === tripId) + 1 : 0;

  return (
    <article
      className={`countdown-card countdown-card--${tone}`}
      aria-labelledby={titleId}
    >
      <header className="countdown-card__head">
        <div className="countdown-card__identity">
          <p className="eyebrow">
            <span className="eyebrow__dot" aria-hidden="true" />
            {kicker}
          </p>
          <h2 className="countdown-card__title" id={titleId}>
            {title}
          </h2>
          <p className="countdown-card__sub">{subtitle}</p>
        </div>
        {departure && (
          <span className="trip-pill">
            Trip {tripIndex} of {totalTrips}
          </span>
        )}
      </header>

      {departure ? (
        <>
          <div className="countdown-block">
            <p className="countdown-label">Departs in</p>
            <div
              className="countdown"
              role="timer"
              aria-label={`Next departure in ${spokenCountdown(departure.secondsUntil)}, scheduled for ${formatTime(
                departure.atMinutes,
              )}`}
            >
              <CountdownDigits value={formatCountdown(departure.secondsUntil)} />
            </div>
            <p className="countdown-scheduled">
              Scheduled for <strong>{formatTime(departure.atMinutes)}</strong>
            </p>
          </div>

          <div className="trip-progress">
            <div className="trip-progress__labels">
              <span>{routeLabel}</span>
              <span>{previousAt !== null ? `Since ${formatTime(previousAt)}` : 'First trip of the day'}</span>
            </div>
            <div
              className="progress"
              role="progressbar"
              aria-label="Progress from the previous departure to the next departure"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <span className="progress__fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="trip-progress__labels trip-progress__labels--end">
              <span>Trip {tripIndex} of {totalTrips}</span>
              <span>Next {formatTime(departure.atMinutes)}</span>
            </div>
          </div>

          <div className="later">
            <p className="later__label">Later today</p>
            {later.length > 0 ? (
              <ul className="later__list">
                {later.map((entry) => (
                  <li key={entry.trip.id}>
                    <span className="later__time">{formatTime(entry.atMinutes)}</span>
                    <span className="later__trip">Trip {tripNumber(entry.trip.id)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="later__empty">Last scheduled trip of the day.</p>
            )}
          </div>
        </>
      ) : (
        <div className="card-state">
          <p className="card-state__title">
            {!service ? 'No service today' : entries.length === 0 ? 'No departures today' : 'Done for today'}
          </p>
          <p className="card-state__reason">
            {!service
              ? info.reason ?? 'No daytime shuttle today.'
              : entries.length === 0
                ? "This stop is not on today's timetable."
                : lastEntry
                  ? `Last departure was ${formatTime(lastEntry.atMinutes)}.`
                  : 'Service has ended for today.'}
          </p>
          <NextServiceNote now={now} stopId={stopId} label="Next service" />
        </div>
      )}

      {requestOnly && (
        <p className="card-note">Request-only pickup on some trips · call 651-631-5310.</p>
      )}
    </article>
  );
}
