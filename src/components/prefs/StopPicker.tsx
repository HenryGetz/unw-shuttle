import { STOP_ORDER, STOPS } from '../../data/route';
import type { StopId } from '../../data/types';
import { MAX_PINNED_STOPS } from '../../lib/prefs';

interface StopPickerProps {
  value: readonly StopId[];
  onToggle: (stopId: StopId) => void;
  idPrefix: string;
  describedBy?: string;
}

function stopMeta(stopId: StopId): string {
  if (stopId === 'erickson') return 'Request only · call Public Safety';
  return STOPS[stopId].subtitle;
}

export function StopPicker({ value, onToggle, idPrefix, describedBy }: StopPickerProps) {
  const full = value.length >= MAX_PINNED_STOPS;

  return (
    <ul className="prefs-stops" aria-label="Campus shuttle stops">
      {STOP_ORDER.map((stopId) => {
        const order = value.indexOf(stopId);
        const selected = order >= 0;
        const locked = !selected && full;
        const inputId = `${idPrefix}-stop-${stopId}`;

        return (
          <li key={stopId}>
            <label
              className={`prefs-stop${selected ? ' is-selected' : ''}${locked ? ' is-locked' : ''}`}
              htmlFor={inputId}
            >
              <input
                id={inputId}
                className="prefs-stop__input"
                type="checkbox"
                checked={selected}
                disabled={locked}
                onChange={() => onToggle(stopId)}
                aria-describedby={describedBy}
              />
              <span className="prefs-stop__box" aria-hidden="true">
                {selected && (
                  <svg viewBox="0 0 16 16">
                    <path
                      d="M3 8.5l3 3 7-7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="prefs-stop__text">
                <span className="prefs-stop__name">{STOPS[stopId].name}</span>
                <span className="prefs-stop__meta">{stopMeta(stopId)}</span>
              </span>
              {selected && (
                <span className="prefs-stop__order" aria-hidden="true">
                  {order + 1}
                </span>
              )}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
