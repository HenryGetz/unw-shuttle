import type { StopId } from '../data/types';
import { nextService } from '../lib/schedule';
import { formatDateKey, formatTime } from '../lib/time';

interface NextServiceNoteProps {
  now: Date;
  stopId: StopId;
  label?: string;
}

export function NextServiceNote({ now, stopId, label = 'Next service' }: NextServiceNoteProps) {
  const next = nextService(now, stopId);

  if (!next) {
    return (
      <div className="next-service next-service--empty">
        <p className="next-service__label">{label}</p>
        <p className="next-service__value">No upcoming service found</p>
        <p className="next-service__detail">Check the published schedule for dates further out.</p>
      </div>
    );
  }

  const dayLabel =
    next.daysAhead === 0
      ? 'Today'
      : next.daysAhead === 1
        ? 'Tomorrow'
        : formatDateKey(next.dateKey, { weekday: true });
  const dayWord = next.daysAhead === 1 ? 'day' : 'days';

  return (
    <div className="next-service">
      <p className="next-service__label">{label}</p>
      <p className="next-service__value">
        {dayLabel} <span className="next-service__sep">·</span> {next.service.shortLabel}
      </p>
      <p className="next-service__detail">
        First departure {formatTime(next.first.atMinutes)}
        {next.daysAhead > 1 ? ` · in ${next.daysAhead} ${dayWord}` : ''}
      </p>
      <p className="next-service__date">{formatDateKey(next.dateKey, { weekday: true, year: true })}</p>
    </div>
  );
}
