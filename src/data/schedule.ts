import type { ServiceDay, StopId, Trip } from './types';

const m = (hhmm: string): number => {
  const [h, mm] = hhmm.split(':').map(Number);
  return h * 60 + mm;
};

type Row = readonly [string | null, string | null, string | null, string | null, string | null];

interface FinalsRow {
  ramseyer: string | null;
  akenson: string | null;
  rosedale: 'request' | null;
  graham: string | null;
  brc: string | 'drop';
  erickson: 'request' | null;
  note?: string;
}

function regularTrip(prefix: string, index: number, row: Row): Trip {
  const [ram, ak, ros, low, brc] = row;
  const times: Partial<Record<StopId, number>> = {};
  if (ram) times.ramseyer = m(ram);
  if (ak) times.akenson = m(ak);
  if (ros) times.rosedale = m(ros);
  if (low) times['lower-riley'] = m(low);
  if (brc) times['brc-totino'] = m(brc);
  return {
    id: `${prefix}-${index + 1}`,
    times,
    ...(brc === null && low ? { dropAt: { 'brc-totino': m(low) + 2 } } : {}),
    requestOnly: [],
    dropOnly: brc === null ? ['brc-totino'] : [],
    ...(brc === null ? { note: 'Drop-off only at Berntsen / Totino' } : {}),
  };
}

function finalsTrip(index: number, row: FinalsRow): Trip {
  const times: Partial<Record<StopId, number>> = {};
  if (row.ramseyer) times.ramseyer = m(row.ramseyer);
  if (row.akenson) times.akenson = m(row.akenson);
  if (row.graham) times.graham = m(row.graham);
  if (row.brc !== 'drop') times['brc-totino'] = m(row.brc);
  const requestOnly: StopId[] = [];
  if (row.rosedale === 'request') requestOnly.push('rosedale');
  if (row.erickson === 'request') requestOnly.push('erickson');
  return {
    id: `finals-${index + 1}`,
    times,
    ...(row.brc === 'drop' && row.graham
      ? { dropAt: { 'brc-totino': m(row.graham) + 2 } }
      : {}),
    requestOnly,
    dropOnly: row.brc === 'drop' ? ['brc-totino'] : [],
    ...(row.note ? { note: row.note } : {}),
  };
}

const MWF_ROWS: Row[] = [
  ['7:24', '7:26', null, '7:30', '7:32'],
  ['7:36', '7:38', '7:40', '7:45', '7:47'],
  ['8:43', '8:45', '8:47', '8:51', '8:53'],
  ['8:56', '8:58', '9:00', '9:05', '9:07'],
  ['9:52', '9:54', null, '9:58', '10:00'],
  ['10:16', '10:18', '10:20', '10:24', '10:26'],
  ['10:57', '10:59', null, '11:13', '11:15'],
  ['11:19', '11:21', '11:23', '11:27', '11:29'],
  ['12:31', '12:33', '12:35', '12:40', '12:42'],
  ['12:46', '12:48', '12:50', '12:55', '12:57'],
  ['13:51', '13:53', '13:55', '14:00', '14:02'],
  ['14:06', '14:08', '14:11', '14:16', '14:21'],
  ['14:57', '14:59', null, '15:03', '15:05'],
  ['15:11', '15:13', '15:15', '15:20', null],
];

const TR_ROWS: Row[] = [
  ['7:35', '7:37', null, '7:41', '7:43'],
  ['7:46', '7:48', '7:50', '7:55', '7:57'],
  ['9:25', '9:27', null, '9:31', '9:33'],
  ['9:41', '9:43', '9:45', '9:50', '9:52'],
  ['10:35', '10:37', null, '10:41', '10:43'],
  ['10:46', '10:48', '10:50', '10:55', '10:57'],
  ['12:31', '12:33', '12:35', '12:40', '12:42'],
  ['12:44', '12:46', '12:48', '12:53', '12:55'],
  ['14:26', '14:28', '14:30', '14:35', '14:37'],
  ['14:40', '14:42', null, '14:46', '14:48'],
  ['14:52', '14:54', null, '14:58', null],
];

const FINALS_ROWS: FinalsRow[] = [
  { ramseyer: '7:30', akenson: '7:32', rosedale: 'request', graham: '7:36', brc: '7:38', erickson: 'request' },
  { ramseyer: '7:46', akenson: '7:48', rosedale: 'request', graham: '7:52', brc: '7:52', erickson: 'request' },
  { ramseyer: '9:00', akenson: '9:02', rosedale: 'request', graham: '9:06', brc: '9:08', erickson: 'request' },
  { ramseyer: '10:00', akenson: '10:02', rosedale: 'request', graham: '10:06', brc: '10:08', erickson: 'request' },
  { ramseyer: '10:15', akenson: '10:17', rosedale: 'request', graham: '10:21', brc: '10:23', erickson: 'request' },
  // The source PDF says "11:00 PM"; the surrounding rows are 10:15 AM and 12:32 PM.
  { ramseyer: '11:00', akenson: '11:02', rosedale: 'request', graham: '11:06', brc: '11:08', erickson: 'request', note: 'Source PDF lists 11:00 PM; corrected to 11:00 AM.' },
  { ramseyer: '12:32', akenson: '12:34', rosedale: 'request', graham: '12:38', brc: '12:40', erickson: 'request' },
  { ramseyer: '13:15', akenson: '13:17', rosedale: 'request', graham: '13:21', brc: '13:23', erickson: 'request' },
  { ramseyer: '14:30', akenson: '14:32', rosedale: 'request', graham: '14:36', brc: '14:38', erickson: 'request' },
  { ramseyer: '15:30', akenson: '15:32', rosedale: 'request', graham: '15:36', brc: 'drop', erickson: null },
];

export const MWF_SERVICE: ServiceDay = {
  kind: 'mwf',
  label: 'Monday · Wednesday · Friday',
  shortLabel: 'MWF',
  trips: MWF_ROWS.map((row, index) => regularTrip('mwf', index, row)),
  note: 'No Wilson Center stop. Call 651-631-5310 for Ericksen pickup.',
};

export const TR_SERVICE: ServiceDay = {
  kind: 'tr',
  label: 'Tuesday · Thursday',
  shortLabel: 'Tue / Thu',
  trips: TR_ROWS.map((row, index) => regularTrip('tr', index, row)),
  note: 'No Wilson Center stop. Ericksen pickup is on request with the driver.',
};

export const FINALS_SERVICE: ServiceDay = {
  kind: 'finals',
  label: 'Finals week · Monday–Thursday',
  shortLabel: 'Finals',
  trips: FINALS_ROWS.map((row, index) => finalsTrip(index, row)),
  note: 'Finals PDF updated Spring 2024. Source row reads 11:00 PM; corrected to 11:00 AM.',
};

export const SCHEDULE_SOURCE = {
  page: 'myUNW · Public Safety · Shuttle Schedule',
  pageUpdated: '2026-10-12',
  captured: '2026-11-23',
  finalsPdfUpdated: 'Spring 2024',
  phone: '651-631-5310',
  eveningWindow: '6:00 PM – 12:00 AM',
};
