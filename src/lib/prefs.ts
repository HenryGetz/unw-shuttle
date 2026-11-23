import { useSyncExternalStore } from 'react';
import { STOP_ORDER } from '../data/route';
import type { StopId } from '../data/types';

export const PREFS_KEY = 'unw_shuttle_prefs_v1';
export const MAX_PINNED_STOPS = 3;

export type MapViewMode = '3d' | '2d';
export type CameraPreference = 'follow' | 'campus' | 'route';

export interface ShuttlePrefs {
  version: 1;
  onboarded: boolean;
  pinnedStops: StopId[];
  viewMode: MapViewMode;
  defaultCamera: CameraPreference;
}

export interface PinPreset {
  id: string;
  label: string;
  detail: string;
  stops: StopId[];
}

export const PIN_PRESETS: PinPreset[] = [
  {
    id: 'ram-billy',
    label: 'RAM ↔ The Billy',
    detail: 'The two main stops',
    stops: ['ramseyer', 'brc-totino'],
  },
  {
    id: 'dorm-main',
    label: 'Dorm ↔ Main Campus',
    detail: 'Akenson and RAM',
    stops: ['akenson', 'ramseyer'],
  },
  {
    id: 'commuter',
    label: 'Commuter / Rosedale',
    detail: 'Rosedale and the Billy',
    stops: ['rosedale', 'brc-totino'],
  },
  {
    id: 'arts-library',
    label: 'Fine Arts / Library',
    detail: 'BRC · Totino and Ericksen',
    stops: ['brc-totino', 'erickson'],
  },
];

export const DEFAULT_PREFS: ShuttlePrefs = {
  version: 1,
  onboarded: false,
  pinnedStops: [],
  viewMode: '3d',
  defaultCamera: 'campus',
};

const VALID_STOPS = new Set<StopId>(STOP_ORDER);

export function isStopId(value: unknown): value is StopId {
  return typeof value === 'string' && VALID_STOPS.has(value as StopId);
}

export function normalizePinnedStops(value: unknown): StopId[] {
  if (!Array.isArray(value)) return [];
  const next: StopId[] = [];
  for (const entry of value) {
    if (!isStopId(entry) || next.includes(entry)) continue;
    next.push(entry);
    if (next.length === MAX_PINNED_STOPS) break;
  }
  return next;
}

function normalizePrefs(value: unknown): ShuttlePrefs {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    version: 1,
    onboarded: raw.onboarded === true,
    pinnedStops: normalizePinnedStops(raw.pinnedStops),
    viewMode: raw.viewMode === '2d' ? '2d' : '3d',
    defaultCamera:
      raw.defaultCamera === 'follow' || raw.defaultCamera === 'route'
        ? raw.defaultCamera
        : 'campus',
  };
}

function loadPrefs(): ShuttlePrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFS };
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return normalizePrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

let current = loadPrefs();
const listeners = new Set<() => void>();

function persist(next: ShuttlePrefs): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    // Private browsing and storage quotas must not break the dashboard.
  }
}

function commit(next: ShuttlePrefs): void {
  current = normalizePrefs(next);
  persist(current);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPrefs(): ShuttlePrefs {
  return current;
}

export function readPrefs(): ShuttlePrefs {
  return normalizePrefs(loadPrefs());
}

export function useShuttlePrefs(): ShuttlePrefs {
  return useSyncExternalStore(subscribe, getPrefs, getPrefs);
}

export function setPrefs(patch: Partial<ShuttlePrefs>): ShuttlePrefs {
  commit({ ...current, ...patch });
  return current;
}

export function setViewMode(viewMode: MapViewMode): void {
  if (current.viewMode !== viewMode) commit({ ...current, viewMode });
}

export function setDefaultCamera(defaultCamera: CameraPreference): void {
  if (current.defaultCamera !== defaultCamera) commit({ ...current, defaultCamera });
}

export function setPinnedStops(pinnedStops: readonly StopId[]): void {
  commit({ ...current, pinnedStops: normalizePinnedStops([...pinnedStops]) });
}

export function togglePinnedStop(stopId: StopId): boolean {
  if (!isStopId(stopId)) return false;
  const existing = current.pinnedStops;
  if (existing.includes(stopId)) {
    commit({ ...current, pinnedStops: existing.filter((id) => id !== stopId) });
    return true;
  }
  if (existing.length >= MAX_PINNED_STOPS) return false;
  commit({ ...current, pinnedStops: [...existing, stopId] });
  return true;
}

export function reorderPinnedStop(from: number, to: number): void {
  const next = [...current.pinnedStops];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  commit({ ...current, pinnedStops: next });
}

export function completeOnboarding(pinnedStops: readonly StopId[]): void {
  commit({ ...current, onboarded: true, pinnedStops: normalizePinnedStops([...pinnedStops]) });
}

export function skipOnboarding(): void {
  commit({ ...current, onboarded: true });
}

export function resetPrefs(): void {
  commit({ ...DEFAULT_PREFS });
}
