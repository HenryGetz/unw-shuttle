import '../styles/map.css';
import { useId, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { CAMPUS } from '../data/campus';
import { officialPlaceForBuilding, type OfficialCategory } from '../data/officialMap';
import { ROUTE_BYPASS, ROUTE_VIA, STOPS, STOP_ORDER, stopShortLabel } from '../data/route';
import type { StopId } from '../data/types';
import type { BusState } from '../lib/schedule';
import { busFocusStop } from '../scene/contracts';
import { layoutLabels, type LabelPlacement } from '../scene/labelLayout';
import { BUILDING_CATEGORY, SCENE_PLACES } from '../scene/places';

interface SvgCampusMapProps {
  bus: BusState;
  billyStop: StopId;
  selectedStop: StopId | null;
  pinnedStops: StopId[];
  labelsVisible: boolean;
  onSelectStop: (stop: StopId) => void;
}

interface MapView {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface MapSizes {
  stopFont: number;
  stopHeight: number;
  stopGap: number;
  buildingFont: number;
  buildingHeight: number;
  buildingLimit: number;
  buildingMinDistance: number;
}

/**
 * The whole route is taller than any reasonable hero. On phones the full plan
 * fits a portrait stage; on desktop it is split at the midpoint into two
 * readable north/south panes instead of shrinking to a narrow strip.
 */
const FULL_VIEW: MapView = { minX: -470, minY: -700, maxX: 220, maxY: 720 };
const ATLAS_VIEWS = {
  north: { minX: -470, minY: -700, maxX: 220, maxY: 10 },
  south: { minX: -470, minY: 10, maxX: 220, maxY: 720 },
} satisfies Record<'north' | 'south', MapView>;

const FULL_SIZES: MapSizes = {
  stopFont: 36,
  stopHeight: 44,
  stopGap: 34,
  buildingFont: 30,
  buildingHeight: 38,
  buildingLimit: 4,
  buildingMinDistance: 120,
};

const ATLAS_SIZES: MapSizes = {
  stopFont: 18,
  stopHeight: 24,
  stopGap: 18,
  buildingFont: 15,
  buildingHeight: 20,
  buildingLimit: 3,
  buildingMinDistance: 90,
};

/** Keep in sync with the 2D map's south edge. */
export const SVG_BUS_OFFMAP_Z = 700;

const ON_MAP_STOPS = STOP_ORDER.filter((stop) => stop !== 'rosedale');
type OnMapStopId = Exclude<StopId, 'rosedale'>;

const LABEL_SIDE: Record<OnMapStopId, 'left' | 'right'> = {
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

function buildingCategory(index: number, name: string | null): OfficialCategory {
  return BUILDING_CATEGORY.get(index) ?? officialPlaceForBuilding(name)?.category ?? 'context';
}

interface StopLabelGeometry {
  id: OnMapStopId;
  text: string;
  labelX: number;
  labelY: number;
  labelAnchor: 'start' | 'end';
  box: { x: number; y: number; width: number; height: number };
}

function stopLabelGeometry(
  id: OnMapStopId,
  billyStop: StopId,
  view: MapView,
  sizes: MapSizes,
): StopLabelGeometry {
  const stop = STOPS[id];
  const text = stopShortLabel(id, billyStop);
  const width = text.length * sizes.stopFont * 0.57 + 18;
  let side = LABEL_SIDE[id];

  if (side === 'right' && stop.x + sizes.stopGap + width > view.maxX - 16) side = 'left';
  if (side === 'left' && stop.x - sizes.stopGap - width < view.minX + 16) side = 'right';

  const labelX = side === 'right' ? stop.x + sizes.stopGap : stop.x - sizes.stopGap;

  return {
    id,
    text,
    labelX,
    labelY: stop.z,
    labelAnchor: side === 'right' ? 'start' : 'end',
    box: {
      x: side === 'right' ? labelX : labelX - width,
      y: stop.z - sizes.stopHeight / 2,
      width,
      height: sizes.stopHeight,
    },
  };
}

interface BuildingLabelCandidate {
  id: string;
  text: string;
  category: OfficialCategory;
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

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

const BUILDING_PRIORITY: Record<OfficialCategory, number> = {
  landmark: 320,
  academic: 280,
  athletic: 240,
  residential: 210,
  context: 170,
};

function placeCandidates(view: MapView, sizes: MapSizes): BuildingLabelCandidate[] {
  return SCENE_PLACES.filter(
    (place) =>
      place.x > view.minX + 20 &&
      place.x < view.maxX - 20 &&
      place.z > view.minY + 20 &&
      place.z < view.maxY - 20,
  )
    .filter((place) => place.number !== undefined || place.category === 'landmark')
    .filter((place) => {
      const names = new Set([normalize(place.name), normalize(place.shortName)]);
      const duplicatesStop = ON_MAP_STOPS.some((id) => names.has(normalize(STOPS[id].shortName)));
      if (duplicatesStop) return false;
      return ON_MAP_STOPS.every((id) => {
        const stop = STOPS[id];
        return Math.hypot(place.x - stop.x, place.z - stop.z) >= sizes.buildingMinDistance;
      });
    })
    .map((place) => {
      const text = `${place.number ? `${place.number} · ` : ''}${place.shortName}`;
      const width = text.length * sizes.buildingFont * 0.52 + 16;
      return {
        id: place.id,
        text,
        category: place.category,
        candidate: {
          id: `place:${place.id}`,
          priority: BUILDING_PRIORITY[place.category] + (place.number ?? 0) / 100,
          x: place.x - view.minX,
          y: place.z - view.minY,
          width,
          height: sizes.buildingHeight,
          gap: 10,
        },
      };
    })
    .sort((left, right) => right.candidate.priority - left.candidate.priority)
    .slice(0, sizes.buildingLimit);
}

function layoutBuildingLabels(
  billyStop: StopId,
  view: MapView,
  sizes: MapSizes,
): Map<string, LabelPlacement> {
  const stopGeometries = ON_MAP_STOPS.map((id) =>
    stopLabelGeometry(id as OnMapStopId, billyStop, view, sizes),
  );
  const dotRadius = sizes.stopFont > 24 ? 22 : 14;

  const obstacles: LabelPlacement[] = stopGeometries.flatMap((geometry) => {
    const stop = STOPS[geometry.id];
    return [
      {
        id: `obstacle:label:${geometry.id}`,
        x: geometry.box.x - view.minX,
        y: geometry.box.y - view.minY,
        width: geometry.box.width,
        height: geometry.box.height,
        visible: true,
      },
      {
        id: `obstacle:dot:${geometry.id}`,
        x: stop.x - dotRadius - view.minX,
        y: stop.z - dotRadius - view.minY,
        width: dotRadius * 2,
        height: dotRadius * 2,
        visible: true,
      },
    ];
  });

  const placements = layoutLabels(
    placeCandidates(view, sizes).map((entry) => entry.candidate),
    view.maxX - view.minX,
    view.maxY - view.minY,
    { top: 16, right: 16, bottom: 16, left: 16 },
    obstacles,
  );
  return new Map(placements.map((placement) => [placement.id, placement]));
}

interface SvgMapPaneProps extends SvgCampusMapProps {
  view: MapView;
  sizes: MapSizes;
  atlas: boolean;
  titleSuffix?: string;
  setHoveredStop: Dispatch<SetStateAction<StopId | null>>;
  labelStops: Set<StopId>;
}

function SvgMapPane({
  bus,
  billyStop,
  selectedStop,
  labelsVisible,
  onSelectStop,
  view,
  sizes,
  atlas,
  titleSuffix,
  setHoveredStop,
  labelStops,
}: SvgMapPaneProps) {
  const reactId = useId();
  const titleId = `campus-map-title-${reactId.replace(/:/g, '')}`;
  const viewWidth = view.maxX - view.minX;
  const viewHeight = view.maxY - view.minY;
  const buildingLayout = useMemo(
    () =>
      labelsVisible
        ? layoutBuildingLabels(billyStop, view, sizes)
        : new Map<string, LabelPlacement>(),
    [billyStop, labelsVisible, sizes, view],
  );
  const geometries = useMemo(
    () =>
      new Map(
        ON_MAP_STOPS.map(
          (id) => [id, stopLabelGeometry(id as OnMapStopId, billyStop, view, sizes)] as const,
        ),
      ),
    [billyStop, sizes, view],
  );
  const stopsInView = useMemo(
    () =>
      ON_MAP_STOPS.filter((id) => {
        const stop = STOPS[id];
        return stop.z >= view.minY - 40 && stop.z <= view.maxY + 40;
      }),
    [view],
  );

  const activeRouteId = bus.phase === 'off' ? null : bus.route.id;
  const busRotation = 180 - (bus.heading * 180) / Math.PI;
  const busOffMap = bus.position.z > SVG_BUS_OFFMAP_Z;
  const busInView =
    !busOffMap &&
    bus.position.x >= view.minX - 20 &&
    bus.position.x <= view.maxX + 20 &&
    bus.position.z >= view.minY - 20 &&
    bus.position.z <= view.maxY + 20;
  const busX = Math.max(view.minX + 30, Math.min(view.maxX - 30, bus.position.x));
  const busZ = Math.max(view.minY + 30, Math.min(view.maxY - 30, bus.position.z));
  const roads = [...CAMPUS.roads].sort((a, b) => a.width - b.width);
  const showNorth = view.minY <= -300 && view.maxY >= -300;

  return (
    <svg
      className={`campus-map ${atlas ? 'campus-map--atlas' : 'campus-map--full'}`}
      viewBox={`${view.minX} ${view.minY} ${viewWidth} ${viewHeight}`}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-labelledby={titleId}
    >
      <title id={titleId}>
        {atlas ? `Campus shuttle map, ${titleSuffix ?? 'campus'} view` : 'Campus shuttle map'}
      </title>
      <desc>
        Nocturnal campus map with the shuttle loop, official buildings, roads, and the main stops.
        Rosedale is shown as an off-map chip. Select a stop marker for next departures.
      </desc>

      <rect
        x={view.minX}
        y={view.minY}
        width={viewWidth}
        height={viewHeight}
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
        {labelsVisible &&
          placeCandidates(view, sizes).map(({ id, text, category, candidate }) => {
            const placement = buildingLayout.get(candidate.id);
            if (!placement?.visible) return null;
            return (
              <text
                key={id}
                x={placement.x + placement.width / 2 + view.minX}
                y={placement.y + placement.height - 9 + view.minY}
                textAnchor="middle"
                aria-hidden="true"
                className={`map-building-label map-building-label--${category}`}
              >
                {text}
              </text>
            );
          })}
      </g>

      <g className="map-stops">
        {stopsInView.map((rawId) => {
          const stopId = rawId as OnMapStopId;
          const stop = STOPS[stopId];
          const geometry = geometries.get(stopId);
          if (!geometry) return null;
          const selected = selectedStop === stopId;
          const isBillyStop = stopId === billyStop;
          const isRam = stopId === 'ramseyer';
          const showLabel = labelStops.has(stopId);
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
              onPointerEnter={() => setHoveredStop(stopId)}
              onPointerLeave={() => setHoveredStop((current) => (current === stopId ? null : current))}
              onFocus={() => setHoveredStop(stopId)}
              onBlur={() => setHoveredStop((current) => (current === stopId ? null : current))}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onSelectStop(stopId);
              }}
            >
              <title>{`${stop.name}. Select for next departures.`}</title>
              <circle className="map-stop__hit" cx={stop.x} cy={stop.z} r={100} />
              <circle className="map-stop__focus" cx={stop.x} cy={stop.z} r={selected ? 40 : 34} />
              {selected && <circle className="map-stop__selection" cx={stop.x} cy={stop.z} r={34} />}
              <circle className="map-stop__halo" cx={stop.x} cy={stop.z} r={selected ? 24 : 20} />
              <circle className="map-stop__dot" cx={stop.x} cy={stop.z} r={selected ? 11 : 8} />
              {showLabel && (
                <text
                  x={geometry.labelX}
                  y={geometry.labelY}
                  textAnchor={geometry.labelAnchor}
                  dominantBaseline="middle"
                  className={`map-stop__label ${isRam || isBillyStop ? 'map-stop__label--primary' : ''}`}
                  paintOrder="stroke"
                  strokeLinejoin="round"
                >
                  {geometry.text}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {busInView && (
        <g
          className={`map-bus map-bus--${bus.phase}`}
          style={{ transform: `translate(${busX}px, ${busZ}px)` }}
          aria-hidden="true"
        >
          <circle className="map-bus__glow" r="44" />
          <g transform={`rotate(${busRotation})`}>
            <path className="map-bus__nose" d="M0 -36 L10 -23 L-10 -23 Z" />
            <rect className="map-bus__body" x="-16" y="-24" width="32" height="48" rx="9" />
            <rect className="map-bus__window" x="-11" y="-16" width="22" height="11" rx="3" />
            <circle className="map-bus__wheel" cx="-9" cy="17" r="3" />
            <circle className="map-bus__wheel" cx="9" cy="17" r="3" />
          </g>
        </g>
      )}

      {showNorth && (
        <g className="map-north" aria-hidden="true" transform="translate(170 -300)">
          <path d="M0 -28 L12 12 L0 4 L-12 12 Z" />
          <text y="-40" textAnchor="middle">N</text>
        </g>
      )}
    </svg>
  );
}

export function SvgCampusMap({
  bus,
  billyStop,
  selectedStop,
  pinnedStops,
  labelsVisible,
  onSelectStop,
}: SvgCampusMapProps) {
  const [hoveredStop, setHoveredStop] = useState<StopId | null>(null);
  const focusStop = busFocusStop(bus);
  const pinnedKey = pinnedStops.join(',');
  const labelStops = useMemo(() => {
    const ids = new Set<StopId>();
    if (labelsVisible) {
      for (const id of ON_MAP_STOPS) ids.add(id);
    } else {
      if (focusStop) ids.add(focusStop);
      if (selectedStop) ids.add(selectedStop);
      for (const id of pinnedKey ? pinnedKey.split(',') : []) ids.add(id as StopId);
      if (hoveredStop) ids.add(hoveredStop);
    }
    return ids;
  }, [focusStop, hoveredStop, labelsVisible, pinnedKey, selectedStop]);

  const shared = {
    bus,
    billyStop,
    selectedStop,
    pinnedStops,
    labelsVisible,
    onSelectStop,
    setHoveredStop,
    labelStops,
  };

  return (
    <div className="campus-map-frame">
      <SvgMapPane {...shared} view={FULL_VIEW} sizes={FULL_SIZES} atlas={false} />
      <div className="campus-map-atlas">
        <div className="campus-map-atlas__pane">
          <SvgMapPane
            {...shared}
            view={ATLAS_VIEWS.north}
            sizes={ATLAS_SIZES}
            atlas
            titleSuffix="north"
          />
          <span className="campus-map-atlas__title" aria-hidden="true">
            North campus
          </span>
        </div>
        <div className="campus-map-atlas__pane">
          <SvgMapPane
            {...shared}
            view={ATLAS_VIEWS.south}
            sizes={ATLAS_SIZES}
            atlas
            titleSuffix="south"
          />
          <span className="campus-map-atlas__title" aria-hidden="true">
            South campus
          </span>
        </div>
      </div>
    </div>
  );
}
