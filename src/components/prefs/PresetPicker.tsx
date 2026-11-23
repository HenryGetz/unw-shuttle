import type { StopId } from '../../data/types';
import { PIN_PRESETS } from '../../lib/prefs';

interface PresetPickerProps {
  value: readonly StopId[];
  onApply: (stops: StopId[]) => void;
}

function sameSet(a: readonly StopId[], b: readonly StopId[]): boolean {
  if (a.length !== b.length) return false;
  return b.every((stopId) => a.includes(stopId));
}

export function PresetPicker({ value, onApply }: PresetPickerProps) {
  return (
    <div className="prefs-presets">
      {PIN_PRESETS.map((preset) => {
        const active = sameSet(value, preset.stops);
        return (
          <button
            key={preset.id}
            type="button"
            className="prefs-preset"
            data-active={active || undefined}
            onClick={() => onApply([...preset.stops])}
            aria-label={`Use preset ${preset.label}: ${preset.detail}`}
          >
            <span className="prefs-preset__label">{preset.label}</span>
            <span className="prefs-preset__detail">{preset.detail}</span>
          </button>
        );
      })}
    </div>
  );
}
