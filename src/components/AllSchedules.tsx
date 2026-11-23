import { useState, type KeyboardEvent } from 'react';
import type { ServiceDay, ServiceKind } from '../data/types';
import { FINALS_SERVICE, MWF_SERVICE, TR_SERVICE } from '../data/schedule';
import { RAM_STOP } from '../data/route';
import { nextDeparture } from '../lib/schedule';
import type { ServiceSnapshot } from '../lib/schedule';
import { ScheduleTable } from './ScheduleTable';

interface AllSchedulesProps {
  now: Date;
  info: ServiceSnapshot;
}

const SERVICES: Record<ServiceKind, ServiceDay> = {
  mwf: MWF_SERVICE,
  tr: TR_SERVICE,
  finals: FINALS_SERVICE,
};

const TABS: { kind: ServiceKind; label: string }[] = [
  { kind: 'mwf', label: 'MWF' },
  { kind: 'tr', label: 'Tue / Thu' },
  { kind: 'finals', label: 'Finals' },
];

export function AllSchedules({ now, info }: AllSchedulesProps) {
  const [active, setActive] = useState<ServiceKind>(() => info.service?.kind ?? 'mwf');
  const activeService = SERVICES[active];
  const todayKind = info.service?.kind ?? null;
  const highlightTripId =
    info.service?.kind === active ? nextDeparture(now, RAM_STOP)?.trip.id ?? null : null;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? TABS.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    setActive(TABS[nextIndex].kind);
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[nextIndex]?.focus();
  };

  return (
    <details className="panel all-schedules">
      <summary className="all-schedules__summary">
        <span className="all-schedules__heading">
          <span className="all-schedules__title">All schedules</span>
          <span className="all-schedules__sub">MWF · Tue / Thu · Finals</span>
        </span>
        <span className="all-schedules__hint">Full published timetable</span>
      </summary>

      <div className="tabs" role="tablist" aria-label="Published shuttle schedules">
        {TABS.map((tab, index) => (
          <button
            key={tab.kind}
            type="button"
            role="tab"
            id={`schedule-tab-${tab.kind}`}
            aria-selected={active === tab.kind}
            aria-controls="all-schedules-panel"
            tabIndex={active === tab.kind ? 0 : -1}
            className={`tab ${active === tab.kind ? 'is-active' : ''}`}
            onClick={() => setActive(tab.kind)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {tab.label}
            {todayKind === tab.kind && <span className="tab__today">Today</span>}
          </button>
        ))}
      </div>

      <div
        id="all-schedules-panel"
        role="tabpanel"
        aria-labelledby={`schedule-tab-${active}`}
        className="tab-panel"
      >
        <div className="tab-panel__head">
          <h3>{activeService.label}</h3>
          <p>{activeService.trips.length} trips</p>
        </div>
        <ScheduleTable
          service={activeService}
          caption={`${activeService.label} shuttle timetable`}
          highlightTripId={highlightTripId}
        />
        {activeService.note && <p className="service-note">{activeService.note}</p>}
      </div>
    </details>
  );
}
