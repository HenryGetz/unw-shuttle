import { SCHEDULE_SOURCE } from '../data/schedule';
import type { ServiceSnapshot } from '../lib/schedule';
import { formatDateKey } from '../lib/time';

interface HeaderProps {
  info: ServiceSnapshot;
}

function badgeLabel(info: ServiceSnapshot): string {
  if (info.status === 'finals') return 'Finals';
  if (info.status === 'weekend') return 'Weekend';
  if (info.status === 'closure') return 'Break';
  return info.service?.kind === 'tr' ? 'Tue–Thu' : 'MWF';
}

export function Header({ info }: HeaderProps) {
  const { clock } = info;
  const time = `${String(clock.hour).padStart(2, '0')}:${String(clock.minute).padStart(2, '0')}:${String(
    clock.second,
  ).padStart(2, '0')}`;
  const date = formatDateKey(clock.dateKey, { weekday: true, year: true });
  const updated = formatDateKey(SCHEDULE_SOURCE.pageUpdated, { weekday: false, year: true });
  const serviceLine = info.service?.label ?? info.reason ?? 'No daytime service';

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="brand">
          <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="6" y="4" width="20" height="22" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M10 9h12M10 14h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="11" cy="23" r="1.8" fill="currentColor" />
            <circle cx="21" cy="23" r="1.8" fill="currentColor" />
          </svg>
          <div className="brand__text">
            <p className="brand__wordmark">UNW SHUTTLE</p>
            <p className="brand__sub">Northwestern · St. Paul</p>
          </div>
        </div>

        <div className="header-service">
          <span className={`status-badge status-badge--${info.status}`}>
            <span className="status-badge__dot" aria-hidden="true" />
            {badgeLabel(info)}
          </span>
          <p className="header-service__line">{serviceLine}</p>
        </div>

        <div className="header-clock">
          <div className="header-clock__row">
            <span className="header-clock__label">Campus time</span>
            <span className="header-clock__time" aria-label={`Campus time ${time}`}>
              {time}
            </span>
          </div>
          <p className="header-clock__date">{date}</p>
          <p className="header-clock__updated">Schedule updated {updated}</p>
        </div>
      </div>
    </header>
  );
}
