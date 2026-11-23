import { STOPS } from '../data/route';
import {
  MAX_PINNED_STOPS,
  reorderPinnedStop,
  setPinnedStops,
  togglePinnedStop,
  useShuttlePrefs,
} from '../lib/prefs';
import { CallSafety } from './prefs/CallSafety';
import { PrefsDialog } from './prefs/PrefsDialog';
import { PresetPicker } from './prefs/PresetPicker';
import { StopPicker } from './prefs/StopPicker';
import '../styles/prefs.css';

export interface MyStopsProps {
  open: boolean;
  onClose: () => void;
}

/** Quick editor for pinned stops. All mutations go through the shared prefs store. */
export function MyStops({ open, onClose }: MyStopsProps) {
  if (!open) return null;
  return <MyStopsDialog onClose={onClose} />;
}

function MyStopsDialog({ onClose }: { onClose: () => void }) {
  const { pinnedStops } = useShuttlePrefs();
  const count = pinnedStops.length;
  const hint =
    count === 0
      ? 'Pick at least one stop below.'
      : count >= MAX_PINNED_STOPS
        ? `${MAX_PINNED_STOPS} of ${MAX_PINNED_STOPS} pinned. Unpin one to add another.`
        : `${count} of ${MAX_PINNED_STOPS} pinned.`;

  return (
    <PrefsDialog
      eyebrow="Personalize"
      title="My stops"
      subtitle="Reorder your glance cards or swap a stop. Changes save instantly."
      onDismiss={onClose}
      footer={
        <div className="mystops-foot">
          <span className="mystops-saved">
            {count === 0 ? 'No stops pinned' : `${count} of ${MAX_PINNED_STOPS} pinned`}
          </span>
          <button type="button" className="prefs-btn prefs-btn--primary" onClick={onClose}>
            Done
          </button>
        </div>
      }
    >
      <section className="prefs-section prefs-section--flush" aria-labelledby="mystops-order-title">
        <div className="prefs-section__head">
          <h3 className="prefs-section__title" id="mystops-order-title">
            Your order
          </h3>
          {count > 0 && <p className="prefs-section__aside">First card leads</p>}
        </div>
        {count === 0 ? (
          <p className="mystops-empty">Nothing pinned yet. Choose up to three stops below.</p>
        ) : (
          <ol className="mystops-list" aria-label="Pinned stops in display order">
            {pinnedStops.map((stopId, index) => (
              <li key={stopId} className="mystops-row">
                <span className="mystops-row__order" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="mystops-row__name">
                  <span className="mystops-row__title">{STOPS[stopId].name}</span>
                  <span className="mystops-row__sub">{STOPS[stopId].subtitle}</span>
                </span>
                <span className="mystops-row__controls">
                  <button
                    type="button"
                    className="mystops-move"
                    onClick={() => reorderPinnedStop(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`Move ${STOPS[stopId].name} up`}
                  >
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path
                        d="M5 12.5l5-5 5 5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="mystops-move"
                    onClick={() => reorderPinnedStop(index, index + 1)}
                    disabled={index === count - 1}
                    aria-label={`Move ${STOPS[stopId].name} down`}
                  >
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path
                        d="M5 7.5l5 5 5-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="mystops-remove"
                    onClick={() => togglePinnedStop(stopId)}
                    aria-label={`Unpin ${STOPS[stopId].name}`}
                  >
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path
                        d="M5 5l10 10M15 5L5 15"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="prefs-section" aria-labelledby="mystops-picker-title">
        <div className="prefs-section__head">
          <h3 className="prefs-section__title" id="mystops-picker-title">
            Add or remove
          </h3>
          <p className="prefs-count">
            {count} of {MAX_PINNED_STOPS}
          </p>
        </div>
        <StopPicker
          value={pinnedStops}
          onToggle={togglePinnedStop}
          idPrefix="mystops"
          describedBy="mystops-hint"
        />
        <p className="prefs-note" id="mystops-hint" role="status">
          {hint}
        </p>
      </section>

      <section className="prefs-section" aria-labelledby="mystops-presets-title">
        <div className="prefs-section__head">
          <h3 className="prefs-section__title" id="mystops-presets-title">
            Quick picks
          </h3>
          <p className="prefs-section__aside">Replaces your picks</p>
        </div>
        <PresetPicker value={pinnedStops} onApply={setPinnedStops} />
      </section>

      <CallSafety note="Ericksen Center pickups are request only." />
    </PrefsDialog>
  );
}
