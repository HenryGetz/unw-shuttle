import { useState } from 'react';
import type { StopId } from '../data/types';
import { completeOnboarding, MAX_PINNED_STOPS, skipOnboarding, useShuttlePrefs } from '../lib/prefs';
import { PrefsDialog } from './prefs/PrefsDialog';
import { PresetPicker } from './prefs/PresetPicker';
import { StopPicker } from './prefs/StopPicker';
import '../styles/prefs.css';

export interface OnboardingProps {
  open: boolean;
  onClose: () => void;
}

/** First-run personalization. Only mounts while open so the draft starts from the store. */
export function Onboarding({ open, onClose }: OnboardingProps) {
  if (!open) return null;
  return <OnboardingDialog onClose={onClose} />;
}

function OnboardingDialog({ onClose }: { onClose: () => void }) {
  const prefs = useShuttlePrefs();
  const [selected, setSelected] = useState<StopId[]>(() =>
    prefs.pinnedStops.slice(0, MAX_PINNED_STOPS),
  );

  const toggle = (stopId: StopId) => {
    setSelected((current) => {
      if (current.includes(stopId)) return current.filter((id) => id !== stopId);
      if (current.length >= MAX_PINNED_STOPS) return current;
      return [...current, stopId];
    });
  };

  const finish = () => {
    if (selected.length === 0) return;
    completeOnboarding(selected);
    onClose();
  };

  const skip = () => {
    skipOnboarding();
    onClose();
  };

  const count = selected.length;
  const hint =
    count === 0
      ? 'Pick at least one stop to continue, or skip for now.'
      : count === MAX_PINNED_STOPS
        ? `${MAX_PINNED_STOPS} of ${MAX_PINNED_STOPS} pinned. Unpin one to add another.`
        : `${count} of ${MAX_PINNED_STOPS} pinned. Add another anytime.`;

  return (
    <PrefsDialog
      eyebrow="Welcome to UNW Shuttle"
      title="Make UNW Shuttle yours"
      subtitle="Pin the stops you actually use. Up to three countdowns stay on your dashboard, in the order you ride."
      size="onboarding"
      decor={<OnboardAccent />}
      onDismiss={skip}
      footer={
        <div className="prefs-actions">
          <button
            type="button"
            className="prefs-btn prefs-btn--primary prefs-btn--block"
            onClick={finish}
            disabled={count === 0}
          >
            {count === 0 ? 'Choose 1–3 stops' : `Pin ${count} ${count === 1 ? 'stop' : 'stops'}`}
          </button>
          <button type="button" className="prefs-btn prefs-btn--ghost prefs-btn--block" onClick={skip}>
            Skip &amp; explore campus
          </button>
        </div>
      }
    >
      <section className="prefs-section prefs-section--flush" aria-labelledby="onboard-stops-title">
        <div className="prefs-section__head">
          <h3 className="prefs-section__title" id="onboard-stops-title">
            Your stops
          </h3>
          <p className="prefs-count">
            {count} of {MAX_PINNED_STOPS}
          </p>
        </div>
        <StopPicker
          value={selected}
          onToggle={toggle}
          idPrefix="onboard"
          describedBy="onboard-hint"
        />
        <p className="prefs-note" id="onboard-hint" role="status">
          {hint}
        </p>
      </section>

      <section className="prefs-section" aria-labelledby="onboard-presets-title">
        <div className="prefs-section__head">
          <h3 className="prefs-section__title" id="onboard-presets-title">
            Quick picks
          </h3>
          <p className="prefs-section__aside">One tap</p>
        </div>
        <PresetPicker value={selected} onApply={setSelected} />
      </section>

      <p className="prefs-note prefs-note--quiet">
        Ericksen Center is request only. Call <a href="tel:6516315310">651-631-5310</a> for a pickup.
        Change your stops anytime from My stops.
      </p>
    </PrefsDialog>
  );
}

function OnboardAccent() {
  return (
    <svg className="onboard-accent" viewBox="0 0 160 160" aria-hidden="true" focusable="false">
      <path className="onboard-accent__gold" d="M22 120V66a46 46 0 0 1 92 0v54" />
      <path className="onboard-accent__lav" d="M46 120V70a22 22 0 0 1 44 0v50" />
      <path className="onboard-accent__line" d="M22 134h116" />
    </svg>
  );
}
