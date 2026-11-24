import { useState } from 'react';
import { formatDebugInput, parseDebugAt } from '../lib/debugClock';
import '../styles/debug.css';

interface DebugClockProps {
  at: Date | null;
  onChange: (at: Date) => void;
  onLive: () => void;
  onExit: () => void;
}

export function DebugClock({ at, onChange, onLive, onExit }: DebugClockProps) {
  const [draft, setDraft] = useState(() => formatDebugInput(at ?? new Date()));
  const target = parseDebugAt(draft);

  const show = () => {
    if (!target) return;
    setDraft(formatDebugInput(target));
    onChange(target);
  };

  const jumpToNow = () => {
    const current = new Date();
    setDraft(formatDebugInput(current));
    onChange(current);
  };

  const resumeLive = () => {
    setDraft(formatDebugInput(new Date()));
    onLive();
  };

  return (
    <aside className="debug-clock" aria-label="Debug clock">
      <form
        className="debug-clock__form"
        onSubmit={(event) => {
          event.preventDefault();
          show();
        }}
      >
        <div className="debug-clock__head">
          <span className="debug-clock__badge">Debug</span>
          <span className="debug-clock__state" aria-live="polite">
            {at ? 'Simulated time' : 'Live clock'}
          </span>
          <button
            type="button"
            className="debug-clock__close"
            onClick={onExit}
            aria-label="Exit debug mode"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path
                d="M4 4l8 8M12 4l-8 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="debug-clock__body">
          <label className="debug-clock__field">
            <span>Chicago date &amp; time</span>
            <input
              type="datetime-local"
              step="1"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-invalid={!target}
              aria-describedby={!target ? 'debug-clock-error' : undefined}
            />
          </label>
          <button type="submit" className="debug-clock__apply" disabled={!target}>
            Show
          </button>
        </div>

        {!target && draft && (
          <p className="debug-clock__error" id="debug-clock-error" role="alert">
            Pick a valid date and time.
          </p>
        )}

        <div className="debug-clock__actions">
          <button type="button" onClick={jumpToNow}>
            Now
          </button>
          {at && (
            <button type="button" onClick={resumeLive}>
              Resume live
            </button>
          )}
          <span className="debug-clock__hint">America/Chicago</span>
        </div>
      </form>
    </aside>
  );
}
