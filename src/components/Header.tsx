import type { ServiceSnapshot } from '../lib/schedule';

interface HeaderProps {
  info: ServiceSnapshot;
  onOpenMyStops: () => void;
}

interface DayBadge {
  short: string;
  description: string;
}

function dayBadge(info: ServiceSnapshot): DayBadge {
  if (info.status === 'finals') {
    return { short: 'Finals', description: 'Finals week schedule' };
  }
  if (info.status === 'weekend') {
    return { short: 'Weekend', description: 'Weekend — evening shuttle only' };
  }
  if (info.status === 'closure') {
    return { short: 'Break', description: info.reason ?? 'Break — no daytime service' };
  }
  return info.service?.kind === 'tr'
    ? { short: 'TTh', description: 'Tuesday and Thursday schedule' }
    : { short: 'MWF', description: 'Monday, Wednesday and Friday schedule' };
}

export function Header({ info, onOpenMyStops }: HeaderProps) {
  const { clock } = info;
  const hour = String(clock.hour).padStart(2, '0');
  const minute = String(clock.minute).padStart(2, '0');
  const day = dayBadge(info);

  return (
    <header className="site-header shell-header">
      <div className="shell-header__inner">
        <div className="shell-brand">
          <svg className="shell-brand__mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect
              x="6"
              y="4"
              width="20"
              height="22"
              rx="5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="M10 9h12M10 14h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="11" cy="23" r="1.8" fill="currentColor" />
            <circle cx="21" cy="23" r="1.8" fill="currentColor" />
          </svg>
          <span className="shell-brand__wordmark">UNW SHUTTLE</span>
        </div>

        <div className="shell-header__right">
          <span
            className="shell-day"
            data-status={info.status}
            title={day.description}
            aria-label={`Today: ${day.description}`}
          >
            <span className="shell-day__dot" aria-hidden="true" />
            {day.short}
          </span>
          <time
            className="shell-clock"
            dateTime={`${clock.dateKey}T${hour}:${minute}`}
            aria-label={`Campus time ${hour}:${minute}`}
          >
            {hour}:{minute}
          </time>
          <button
            type="button"
            className="shell-mystops"
            onClick={onOpenMyStops}
            aria-label="Open My Stops settings"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M12 3.4l2.72 5.52 6.09.88-4.4 4.3 1.03 6.06L12 17.3l-5.44 2.86 1.03-6.06-4.4-4.3 6.09-.88z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            <span className="shell-mystops__label">My Stops</span>
          </button>
        </div>
      </div>
    </header>
  );
}
