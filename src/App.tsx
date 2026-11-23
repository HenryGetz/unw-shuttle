import { useState } from 'react';
import { useNow } from './hooks/useNow';
import { BILLY_FINALS_STOP, BILLY_REGULAR_STOP } from './data/route';
import type { StopId } from './data/types';
import { busStateAt, nextService, serviceInfoAt } from './lib/schedule';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { MapPanel } from './components/MapPanel';
import { StopDetail } from './components/StopDetail';
import { TodaySchedule } from './components/TodaySchedule';
import { AllSchedules } from './components/AllSchedules';
import { Footer } from './components/Footer';

export function App() {
  const now = useNow();
  const info = serviceInfoAt(now);
  const bus = busStateAt(now);
  const [selectedStop, setSelectedStop] = useState<StopId | null>(null);
  const nextRam = info.service ? null : nextService(now, 'ramseyer');
  const billyStop =
    info.status === 'finals' || nextRam?.service.kind === 'finals'
      ? BILLY_FINALS_STOP
      : BILLY_REGULAR_STOP;

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to dashboard
      </a>
      <Header info={info} />
      <main className="app-main" id="main">
        <Hero now={now} info={info} billyStop={billyStop} />
        <div className="dashboard">
          <MapPanel
            now={now}
            info={info}
            bus={bus}
            billyStop={billyStop}
            selectedStop={selectedStop}
            onSelectStop={setSelectedStop}
          />
          <div className="dashboard__content">
            <StopDetail
              now={now}
              info={info}
              stop={selectedStop}
              billyStop={billyStop}
              onClear={() => setSelectedStop(null)}
              onSelect={setSelectedStop}
            />
            <TodaySchedule now={now} info={info} selectedStop={selectedStop} />
            <AllSchedules now={now} info={info} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
