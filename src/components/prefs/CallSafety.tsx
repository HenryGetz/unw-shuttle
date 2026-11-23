interface CallSafetyProps {
  note?: string;
  compact?: boolean;
}

/** Ericksen Center pickups are request-only; every surface links the driver line here. */
export function CallSafety({ note, compact = false }: CallSafetyProps) {
  return (
    <div className={`prefs-call${compact ? ' prefs-call--compact' : ''}`}>
      <a className="prefs-call__link" href="tel:6516315310">
        <svg className="prefs-call__icon" viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M5.2 3.5h2.3l1.2 3-1.6 1.3a10 10 0 004.1 4.1l1.3-1.6 3 1.2v2.3a1.7 1.7 0 01-1.9 1.7A12.2 12.2 0 013.5 5.4a1.7 1.7 0 011.7-1.9z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
        <span className="prefs-call__label">Call Public Safety</span>
        <span className="prefs-call__sep" aria-hidden="true">
          ·
        </span>
        <span className="prefs-call__number">651-631-5310</span>
      </a>
      {note && <p className="prefs-call__note">{note}</p>}
    </div>
  );
}
