import '../styles/map.css';
import { useEffect, useMemo, useRef } from 'react';
import { CAMPUS } from '../data/campus';
import { officialPlaceForBuilding, type OfficialCategory } from '../data/officialMap';
import { BILLY_FINALS_STOP, ROUTE_BYPASS, ROUTE_VIA, STOPS, STOP_ORDER } from '../data/route';
import type { StopId } from '../data/types';
import type { BusState } from '../lib/schedule';
import { layoutLabels, type LabelPlacement } from '../scene/labelLayout';
import { BUILDING_CATEGORY, SCENE_PLACES } from '../scene/places';

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

function buildingCategory(index: number, name: string | null): OfficialCategory {
  return BUILDING_CATEGORY.get(index) ?? officialPlaceForBuilding(name)?.category ?? 'context';
}

interface StopLabelGeometry {
  id: Exclude<StopId, 'rosedale'>;
  side: 'left' | 'right';
  labelX: number;
  labelAnchor: 'start' | 'end';
  labelStartY: number;
  lines: string[];
  box: { x: number; y: number; width: number; height: number };
}

function stopLabelGeometry(
  id: Exclude<StopId, 'rosedale'>,
  billyStop: StopId,
): StopLabelGeometry {
  const stop = STOPS[id];
  const lines = stopLabel(id, billyStop);
  const width = Math.max(...lines.map((line) => line.length)) * 18 + 28;
  const labelStartY = stop.z - (lines.length > 1 ? 16 : 0);
  const height = (lines.length - 1) * 30 + 48;
  let side = LABEL_SIDE[id];

  if (side === 'right' && stop.x + 26 + width > VIEW.maxX - 14) side = 'left';
  if (side === 'left' && stop.x - 26 - width < VIEW.minX + 14) side = 'right';

  const labelX =
    side === 'right'
      ? Math.min(stop.x + 26, VIEW.maxX - 14 - width)
      : Math.max(stop.x - 26, VIEW.minX + 14 + width);

  return {
    id,
    side,
    labelX,
    labelAnchor: side === 'right' ? 'start' : 'end',
    labelStartY,
    lines,
    box: {
      x: side === 'right' ? labelX : labelX - width,
      y: labelStartY - 24,
      width,
      height,
    },
  };
}

interface PlaceCandidate {
  place: (typeof SCENE_PLACES)[number];
  candidate: {
    id: string;
    priority: number;
    x: number;
    y: number;
    width: number;
    height: number;
    gap: number;
  };
}

const PLACE_CANDIDATES: PlaceCandidate[] = SCENE_PLACES.filter(
  (place) =>
    place.x > VIEW.minX + 10 &&
    place.x < VIEW.maxX - 10 &&
    place.z > VIEW.minY + 10 &&
    place.z < VIEW.maxY - 10,
).map((place) => {
  const text = `${place.number ? `${place.number} · ` : ''}${place.shortName}`;
  return {
    place,
    candidate: {
      id: `place:${place.id}`,
      priority: place.source === 'osm' ? 300 : 220,
      x: place.x - VIEW.minX,
      y: place.z - VIEW.minY,
      width: text.length * 18 + 20,
      height: 32,
      gap: 10,
    },
  };
});

function layoutMapLabels(billyStop: StopId) {
  const stops = ON_MAP_STOPS.map((id) =>
    stopLabelGeometry(id as Exclude<StopId, 'rosedale'>, billyStop),
  );

  const obstacles: LabelPlacement[] = stops.flatMap((geometry) => {
    const stop = STOPS[geometry.id];
    return [
      {
        id: `obstacle:label:${geometry.id}`,
        x: geometry.box.x - VIEW.minX,
        y: geometry.box.y - VIEW.minY,
        width: geometry.box.width,
        height: geometry.box.height,
        visible: true,
      },
      {
        id: `obstacle:dot:${geometry.id}`,
        x: stop.x - 26 - VIEW.minX,
        y: stop.z - 26 - VIEW.minY,
        width: 52,
        height: 52,
        visible: true,
      },
    ];
  });

  const placements = layoutLabels(
    PLACE_CANDIDATES.map((entry) => entry.candidate),
    VIEW_WIDTH,
    VIEW_HEIGHT,
    { top: 16, right: 16, bottom: 16, left: 16 },
    obstacles,
  );
  return { stops, placements: new Map(placements.map((placement) => [placement.id, placement])) };
}

export function SvgCampusMap({
  bus,
  billyStop,
  selectedStop,
  onSelectStop,
}: SvgCampusMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const layout = useMemo(() => layoutMapLabels(billyStop), [billyStop]);

  useEffect(() => {
    const svg = svgRef.current;
    const scroller = svg?.parentElement;
    if (!svg || !scroller) return;
    const apply = () => {
      const mainCampusY = ((100 - VIEW.minY) / VIEW_HEIGHT) * svg.clientHeight;
      scroller.scrollTop = Math.max(0, mainCampusY - scroller.clientHeight * 0.45);
    };
    apply();
    // svg.clientHeight is 0 until the stylesheet has laid the plan out.
    const frame = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(frame);
  }, []);

  const activeRouteId = bus.phase === 'off' ? null : bus.route.id;
  const busRotation = 180 - (bus.heading * 180) / Math.PI;
  const busOffMap = bus.position.z > SVG_BUS_OFFMAP_Z;
  const busX = Math.max(VIEW.minX + 26, Math.min(VIEW.maxX - 26, bus.position.x));
  const busZ = Math.max(VIEW.minY + 26, Math.min(VIEW.maxY - 26, bus.position.z));
  const roads = [...CAMPUS.roads].sort((a, b) => a.width - b.width);

  return (
    <svg
      ref={svgRef}
      className="campus-map"
      viewBox={`${VIEW.minX} ${VIEW.minY} ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-labelledby="campus-map-title"
    >
      <title id="campus-map-title">Campus shuttle map</title>
      <desc>
        Nocturnal campus map with the shuttle loop, official buildings, roads, and the main stops.
        Rosedale is shown as an off-map chip. Select a stop marker for next departures.
      </desc>

      <rect
        x={VIEW.minX}
        y={VIEW.minY}
        width={VIEW_WIDTH}
        height={VIEW_HEIGHT}
        className="map-ground"
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
            className={`map-building map-building--${buildingCategory(index, building.name)}`}
          />
        ))}
      </g>

      <g className="map-routes" aria-hidden="true">
        {[ROUTE_BYPASS, ROUTE_VIA].map((route) => (
          <g key={route.id}>
            {route.id === activeRouteId && (
              <polyline
                points={linePoints(route.points)}
                className="map-route map-route--warm"
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

      <g className="map-labels" aria-hidden="true">
        {PLACE_CANDIDATES.map(({ place, candidate }) => {
          const placement = layout.placements.get(candidate.id);
          if (!placement?.visible) return null;
          const text = `${place.number ? `${place.number} · ` : ''}${place.shortName}`;
          return (
            <text
              key={place.id}
              x={placement.x + placement.width / 2 + VIEW.minX}
              y={placement.y + placement.height - 8 + VIEW.minY}
              textAnchor="middle"
              className={[
                'map-building-label',
                `map-building-label--${place.category}`,
                place.source === 'anchor' ? 'map-building-label--anchor' : '',
                place.category === 'context' ? 'map-building-label--minor' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {text}
            </text>
          );
        })}
      </g>

      <g className="map-stops">
        {layout.stops.map((geometry) => {
          const stopId = geometry.id;
          const stop = STOPS[stopId];
          const selected = selectedStop === stopId;
          const isBillyStop = stopId === billyStop;
          const isRam = stopId === 'ramseyer';
          const { lines, labelX, labelAnchor, labelStartY } = geometry;
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
              <circle className="map-stop__hit" cx={stop.x} cy={stop.z} r={80} />
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
          <circle className="map-bus__glow" r="32" />
          <g transform={`rotate(${busRotation})`}>
            <path className="map-bus__nose" d="M0 -25 L7 -16 L-7 -16 Z" />
            <rect className="map-bus__body" x="-12" y="-17" width="24" height="36" rx="7" />
            <rect className="map-bus__window" x="-8" y="-11" width="16" height="8" rx="2" />
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
