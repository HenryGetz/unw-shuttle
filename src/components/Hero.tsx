import { BILLY_FINALS_STOP, STOPS } from '../data/route';
import type { StopId } from '../data/types';
import type { ServiceSnapshot } from '../lib/schedule';
import { CountdownCard } from './CountdownCard';

interface HeroProps {
  now: Date;
  info: ServiceSnapshot;
  billyStop: StopId;
}

export function Hero({ now, info, billyStop }: HeroProps) {
  const billyFinals = billyStop === BILLY_FINALS_STOP;

  return (
    <section className="hero" aria-label="Next departures">
      <CountdownCard
        now={now}
        info={info}
        stopId="ramseyer"
        title="Next at RAM"
        kicker="Ramseyer · RAM"
        subtitle={STOPS.ramseyer.subtitle}
        tone="ram"
      />
      <CountdownCard
        now={now}
        info={info}
        stopId={billyStop}
        title={billyFinals ? 'The Billy · Graham' : 'The Billy'}
        kicker={billyFinals ? 'Graham · Finals' : 'BRC / Totino'}
        subtitle={billyFinals ? 'Graham Commons · finals week stop' : STOPS[billyStop].subtitle}
        tone="billy"
      />
    </section>
  );
}
