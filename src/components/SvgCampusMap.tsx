import { CAMPUS } from '../data/campus';
import { BILLY_FINALS_STOP, ROUTE_BYPASS, ROUTE_VIA, STOPS, STOP_ORDER } from '../data/route';
import type { BusState } from '../lib/schedule';
import type { StopId } from '../data/types';

interface SvgCampusMapProps {
  bus: BusState;
  billyStop: StopId;
  selectedStop: StopId | null;
  onSelectStop: (stop: StopId) => void;
}

/**
 * Focused campus-loop view. The whole loop fits; the Rosedale spur leaves the
 * bottom edge and is represented by an off-map chip in MapPanel.
 */
const VIEW = { minX: -470, minY: -700, maxX: 220, maxY: 720 };
const VIEW_WIDTH = VIEW.maxX - VIEW.minX;
const VIEW_HEIGHT = VIEW.maxY - VIEW.minY;

/** Keep in sync with the 2D map's south edge. */
export const SVG_BUS_OFFMAP_Z = 700;

const ON_MAP_STOPS = STOP_ORDER.filter((stop) => stop !== 'rosedale');

const LABEL_SIDE: Record<Exclude<StopId, 'rosedale'>, 'left' | 'right'> = {
  ramseyer: 'right',
  akenson: 'right',
  'lower-riley': 'right',
  graham: 'right',
  erickson: 'right',
  'brc-totino': 'left',
};

const linePoints = (points: [number, number][]) =>
  points.map(([x, z]) => `${x.toFixed(1)},${z.toFixed(1)}`).join(' ');

const ringPath = (points: [number, number][]) =>
  `${points.map(([x, z], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${z.toFixed(1)}`).join(' ')} Z`;

function stopLabel(id: StopId, billyStop: StopId): string[] {
  if (id === 'graham') {
    return billyStop === BILLY_FINALS_STOP ? ['Graham', 'The Billy'] : ['Graham'];
  }
  if (id === 'brc-totino') {
    return billyStop === 'brc-totino' ? ['Billy · BRC'] : ['BRC / Totino'];
  }
  return [STOPS[id].shortName];
}

export function SvgCampusMap({
  bus,
  billyStop,
  selectedStop,
  onSelectStop,
}: SvgCampusMapProps) {
  const activeRouteId = bus.phase === 'off' ? null : bus.route.id;
  const busRotation = 180 - (bus.heading * 180) / Math.PI;
  const busOffMap = bus.position.z > SVG_BUS_OFFMAP_Z;
  const busX = Math.max(VIEW.minX + 26, Math.min(VIEW.maxX - 26, bus.position.x));
  const busZ = Math.max(VIEW.minY + 26, Math.min(VIEW.maxY - 26, bus.position.z));
  const roads = [...CAMPUS.roads].sort((a, b) => a.width - b.width);

  return (
    <svg
      className="campus-map"
      viewBox={`${VIEW.minX} ${VIEW.minY} ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-labelledby="campus-map-title"
    >
      <title id="campus-map-title">Campus shuttle map</title>
      <desc>
        Focused campus map with the shuttle loop, buildings, roads, and the main stops. Rosedale is shown
        as an off-map chip. Select a stop marker for next departures.
      </desc>

      <defs>
        <pattern id="campus-map-grid" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M100 0H0V100" fill="none" stroke="rgba(148, 180, 200, 0.07)" strokeWidth="1" />
        </pattern>
      </defs>

      <rect
        x={VIEW.minX}
        y={VIEW.minY}
        width={VIEW_WIDTH}
        height={VIEW_HEIGHT}
        className="map-ground"
      />
      <rect
        x={VIEW.minX}
        y={VIEW.minY}
        width={VIEW_WIDTH}
        height={VIEW_HEIGHT}
        fill="url(#campus-map-grid)"
        aria-hidden="true"
      />

      <g className="map-water" aria-hidden="true">
        {CAMPUS.water.map((water, index) => (
          <path
            key={`water-${index}`}
            d={`${ringPath(water.poly)} ${water.holes.map(ringPath).join(' ')}`}
            fillRule="evenodd"
            className="map-water__shape"
          />
        ))}
      </g>

      <polygon
        className="map-campus-boundary"
        points={linePoints(CAMPUS.campus)}
        aria-hidden="true"
      />

      <g className="map-roads" aria-hidden="true">
        {roads.map((road, index) => (
          <polyline
            key={`road-${index}`}
            points={linePoints(road.poly)}
            className={`map-road map-road--${road.kind}`}
            strokeWidth={road.width}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>

      <g className="map-buildings" aria-hidden="true">
        {CAMPUS.buildings.map((building, index) => (
          <polygon
            key={`building-${index}`}
            points={linePoints(building.poly)}
            className={`map-building map-building--${building.kind}`}
          />
        ))}
      </g>

      <g className="map-routes" aria-hidden="true">
        {[ROUTE_BYPASS, ROUTE_VIA].map((route) => (
          <g key={route.id}>
            {route.id === activeRouteId && (
              <polyline
                points={linePoints(route.points)}
                className="map-route map-route--glow"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            <polyline
              points={linePoints(route.points)}
              className={`map-route ${route.id === activeRouteId ? 'map-route--active' : 'map-route--inactive'}`}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}
      </g>

      <g className="map-stops">
        {ON_MAP_STOPS.map((stopId) => {
          const stop = STOPS[stopId];
          const side = LABEL_SIDE[stopId];
          const selected = selectedStop === stopId;
          const isBillyStop = stopId === billyStop;
          const isRam = stopId === 'ramseyer';
          const lines = stopLabel(stopId, billyStop);
          const labelX = side === 'right' ? stop.x + 26 : stop.x - 26;
          const labelAnchor = side === 'right' ? 'start' : 'end';
          const labelStartY = stop.z - (lines.length > 1 ? 16 : 0);
          const markerClass = [
            'map-stop',
            isRam ? 'map-stop--ram' : '',
            isBillyStop ? 'map-stop--billy' : '',
            selected ? 'map-stop--selected' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <g
              key={stopId}
              className={markerClass}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`${stop.name}. ${isBillyStop ? "Today's Billy stop. " : ''}Select for next departures.`}
              onClick={() => onSelectStop(stopId)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onSelectStop(stopId);
              }}
            >
              <title>{`${stop.name}. Select for next departures.`}</title>
              <circle className="map-stop__hit" cx={stop.x} cy={stop.z} r={44} />
              <circle className="map-stop__focus" cx={stop.x} cy={stop.z} r={selected ? 38 : 32} />
              {selected && <circle className="map-stop__selection" cx={stop.x} cy={stop.z} r={32} />}
              <circle className="map-stop__halo" cx={stop.x} cy={stop.z} r={selected ? 20 : 17} />
              <circle className="map-stop__dot" cx={stop.x} cy={stop.z} r={selected ? 8 : 6.5} />
              <text
                x={labelX}
                y={labelStartY}
                textAnchor={labelAnchor}
                dominantBaseline="middle"
                className={`map-stop__label ${isRam || isBillyStop ? 'map-stop__label--primary' : ''}`}
                paintOrder="stroke"
                strokeLinejoin="round"
              >
                {lines.map((line, index) => (
                  <tspan
                    key={line}
                    x={labelX}
                    dy={index === 0 ? 0 : 30}
                    className={index > 0 ? 'map-stop__label-sub' : undefined}
                  >
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
      </g>

      {!busOffMap && (
        <g
          className={`map-bus map-bus--${bus.phase}`}
          style={{ transform: `translate(${busX}px, ${busZ}px)` }}
          aria-hidden="true"
        >
          <circle className="map-bus__glow" r="34" />
          <g transform={`rotate(${busRotation})`}>
            <path className="map-bus__nose" d="M0 -25 L7 -16 L-7 -16 Z" />
            <rect className="map-bus__body" x="-12" y="-17" width="24" height="36" rx="7" />
            <rect className="map-bus__window" x="-8" y="-12" width="16" height="8" rx="2" />
            <circle className="map-bus__wheel" cx="-7" cy="12" r="2.2" />
            <circle className="map-bus__wheel" cx="7" cy="12" r="2.2" />
          </g>
        </g>
      )}

      <g className="map-north" aria-hidden="true" transform="translate(190 -660)">
        <path d="M0 -20 L8 8 L0 3 L-8 8 Z" />
        <text y="-28" textAnchor="middle">N</text>
      </g>
    </svg>
  );
}
