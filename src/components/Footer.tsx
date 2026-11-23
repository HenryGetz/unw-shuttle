import { SCHEDULE_SOURCE } from '../data/schedule';
import { CAMPUS_TZ, formatDateKey } from '../lib/time';

const PHONE_HREF = `tel:+1${SCHEDULE_SOURCE.phone.replace(/\D/g, '')}`;

export function Footer() {
  const updated = formatDateKey(SCHEDULE_SOURCE.pageUpdated, { weekday: false, year: true });

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <p className="site-footer__wordmark">UNW SHUTTLE</p>
          <p className="site-footer__source">
            Source: myUNW Public Safety shuttle schedule · page updated {updated} · finals PDF{' '}
            {SCHEDULE_SOURCE.finalsPdfUpdated}
          </p>
          <p className="site-footer__disclaimer">
            Unofficial project. Not affiliated with the University of Northwestern – St. Paul. Times
            can change; confirm with Public Safety before you rely on them.
          </p>
        </div>
        <div className="site-footer__info">
          <p>
            <strong>Evening shuttle</strong> {SCHEDULE_SOURCE.eveningWindow} ·{' '}
            <a href={PHONE_HREF}>{SCHEDULE_SOURCE.phone}</a>
          </p>
          <p>
            <strong>All times</strong> {CAMPUS_TZ}
          </p>
          <p className="site-footer__caveat">Scheduled simulation, not live GPS. Map data © OpenStreetMap contributors (<a href="https://www.openstreetmap.org/copyright">ODbL</a>).</p>
          <p className="site-footer__caveat">No Wilson Center stop. Ericksen pickup is request-only.</p>
        </div>
      </div>
    </footer>
  );
}
