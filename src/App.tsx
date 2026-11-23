import { useState } from 'react';
import { useNow } from './hooks/useNow';
import { BILLY_FINALS_STOP, BILLY_REGULAR_STOP } from './data/route';
import type { StopId } from './data/types';
import { busStateAt, nextService, serviceInfoAt } from './lib/schedule';
import { setDefaultCamera, setViewMode, skipOnboarding, useShuttlePrefs } from './lib/prefs';
import { Header } from './components/Header';
import { GlancePanel } from './components/GlancePanel';
import { MapPanel } from './components/MapPanel';
import { PinnedStops } from './components/PinnedStops';
import { Onboarding } from './components/Onboarding';
import { MyStops } from './components/MyStops';
import { TodaySchedule } from './components/TodaySchedule';
import { AllSchedules } from './components/AllSchedules';
import { GoodToKnow } from './components/GoodToKnow';
import { Footer } from './components/Footer';
import './styles/shell.css';
import './styles/glance.css';

export function App() {
  const now = useNow();
  const info = serviceInfoAt(now);
  const bus = busStateAt(now);
  const prefs = useShuttlePrefs();
  const [selectedStop, setSelectedStop] = useState<StopId | null>(null);
  const [myStopsOpen, setMyStopsOpen] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const nextRam = info.service ? null : nextService(now, 'ramseyer');
  const billyStop =
    info.status === 'finals' || nextRam?.service.kind === 'finals'
      ? BILLY_FINALS_STOP
      : BILLY_REGULAR_STOP;

  const resetMap = () => {
    setResetToken((token) => token + 1);
    setDefaultCamera('overview');
  };

  // On phones the map sits below the countdowns, and any layout can select a
  // stop from the below-fold schedule. Bring the map into view or nothing happens.
  const selectStop = (stop: StopId | null) => {
    setSelectedStop(stop);
    if (!stop) return;
    const map = document.querySelector('.map-hero');
    if (!map) return;
    const rect = map.getBoundingClientRect();
    const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0;
    const visible = Math.max(
      0,
      Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, header + 8),
    );
    if (visible >= Math.min(rect.height, window.innerHeight - header - 16) * 0.5) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const top = window.scrollY + rect.top - header - 8;
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to map
      </a>
      <Header info={info} onOpenMyStops={() => setMyStopsOpen(true)} />
      <main className="shell-main" id="main">
        <div className="dashboard-hero">
          <GlancePanel
            now={now}
            info={info}
            bus={bus}
            billyStop={billyStop}
            pinnedStops={prefs.pinnedStops}
            onSelectStop={selectStop}
          />
          <div className="dashboard-map">
            <MapPanel
              now={now}
              info={info}
              bus={bus}
              billyStop={billyStop}
              selectedStop={selectedStop}
              onSelectStop={selectStop}
              onClearStop={() => setSelectedStop(null)}
              viewMode={prefs.viewMode}
              onViewModeChange={setViewMode}
              camera={prefs.defaultCamera}
              onCameraChange={setDefaultCamera}
              resetToken={resetToken}
              onReset={resetMap}
              pinnedStops={prefs.pinnedStops}
            />
          </div>
        </div>
        <div className="shell-flow">
          <PinnedStops
            now={now}
            info={info}
            billyStop={billyStop}
            selectedStop={selectedStop}
            onSelectStop={selectStop}
            excludeStops={['ramseyer', billyStop]}
          />
          <TodaySchedule
            now={now}
            info={info}
            billyStop={billyStop}
            selectedStop={selectedStop}
            onSelectStop={selectStop}
          />
          <AllSchedules now={now} info={info} />
          <GoodToKnow />
        </div>
      </main>
      <Footer />
      <Onboarding open={!prefs.onboarded} onClose={skipOnboarding} />
      <MyStops open={myStopsOpen} onClose={() => setMyStopsOpen(false)} />
    </div>
  );
}
