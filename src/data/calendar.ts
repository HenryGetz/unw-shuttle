export interface DateRange {
  start: string;
  end: string;
  label: string;
}

/**
 * Days the shuttle does not run. Source: myUNW academic calendar, captured
 * 2026-11-23. The shuttle does not operate during breaks, holidays, or chapel.
 * Keep `end` inclusive.
 */
export const CLOSURES: DateRange[] = [
  { start: '2026-11-25', end: '2026-11-29', label: 'Thanksgiving recess' },
  { start: '2026-12-18', end: '2027-01-10', label: 'Christmas recess' },
  { start: '2027-01-18', end: '2027-01-18', label: 'Martin Luther King Jr. Day' },
  { start: '2027-03-04', end: '2027-03-14', label: 'Mid-semester break' },
  { start: '2027-03-20', end: '2027-03-29', label: 'Easter recess' },
];

/** Finals windows where the finals-week timetable replaces the regular one. */
export const FINALS: DateRange[] = [
  { start: '2026-12-14', end: '2026-12-17', label: 'Fall finals' },
  { start: '2027-03-02', end: '2027-03-03', label: 'Quad 3 finals' },
];

export const CALENDAR_CAPTURED = '2026-11-23';
export const CALENDAR_COVERAGE_END = '2027-03-29';

export function inRange(dateKey: string, range: DateRange): boolean {
  return dateKey >= range.start && dateKey <= range.end;
}
