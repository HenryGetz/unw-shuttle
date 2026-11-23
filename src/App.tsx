import { useState } from 'react';
import { useNow } from './hooks/useNow';
import { BILLY_FINALS_STOP, BILLY_REGULAR_STOP } from './data/route';
import type { StopId } from './data/types';
import { busStateAt, nextService, serviceInfoAt } from './lib/schedule';
import { setDefaultCamera, setViewMode, skipOnboarding, useShuttlePrefs } from './lib/prefs';
import { Header } from './components/Header';
import { MapPanel } from './components/MapPanel';
import { PinnedStops } from './components/PinnedStops';
import { Onboarding } from './components/Onboarding';
import { MyStops } from './components/MyStops';
import { StopDetail } from './components/StopDetail';
import { TodaySchedule } from './components/TodaySchedule';
import { AllSchedules } from './components/AllSchedules';
import { GoodToKnow } from './components/GoodToKnow';
import { Footer } from './components/Footer';
import './styles/shell.css';

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
    setDefaultCamera('campus');
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to map
      </a>
      <Header info={info} onOpenMyStops={() => setMyStopsOpen(true)} />
      <main className="shell-main" id="main">
        <MapPanel
          now={now}
          info={info}
          bus={bus}
          billyStop={billyStop}
          selectedStop={selectedStop}
          onSelectStop={setSelectedStop}
          viewMode={prefs.viewMode}
          onViewModeChange={setViewMode}
          camera={prefs.defaultCamera}
          onCameraChange={setDefaultCamera}
          resetToken={resetToken}
          onReset={resetMap}
          pinnedStops={prefs.pinnedStops}
        />
        <div className="shell-flow">
          <PinnedStops
            now={now}
            info={info}
            billyStop={billyStop}
            selectedStop={selectedStop}
            onSelectStop={setSelectedStop}
            onOpenMyStops={() => setMyStopsOpen(true)}
          />
          <StopDetail
            now={now}
            info={info}
            stop={selectedStop}
            billyStop={billyStop}
            onClear={() => setSelectedStop(null)}
            onSelect={setSelectedStop}
          />
          <TodaySchedule
            now={now}
            info={info}
            selectedStop={selectedStop}
            onSelectStop={setSelectedStop}
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
