# UNW Shuttle

Live countdowns, the full published timetable, and a 3D campus map for the
University of Northwestern – St. Paul shuttle.

[![UNW Shuttle preview](docs/preview.png)](https://henrygetz.github.io/unw-shuttle/)

The point is simple: when it is 10°F outside, you should not have to guess when
the next bus reaches Ramseyer or the Billy. Open the page, read the timer, leave
at the right minute.

## What it does

- **Two big countdowns**: next scheduled departure at **RAM** (MJMC / Ramseyer)
  and **the Billy** (BRC / Totino during the regular schedule, Graham Commons
  during finals).
- **A bus that moves on a real map**: the 3D scene follows the published route
  and timetable, and the 2D SVG map is always available as a fallback. This is
  a schedule simulation, not live GPS; there is no vehicle tracker behind it.
- **The whole day's timetable**: every published trip, with RAM, Akenson,
  Rosedale, Lower Riley, the Billy, and Ericksen side by side.
- **Finals, weekends, and breaks**: the service calendar switches to the finals
  timetable and explains why there is no bus during recesses.
- **Campus time, not browser time**: all schedule math runs in
  `America/Chicago`, so it stays correct on a laptop set to another zone.
- **No backend, no API keys, no runtime network calls**: the schedule and map
  are baked into the static build and deployed to GitHub Pages.

## Run it

Requires Node 22+ and pnpm 10.

```bash
pnpm install
pnpm dev        # http://localhost:5180
pnpm test       # schedule/engine tests
pnpm build      # static build in dist/
pnpm preview    # serve the production build
```

## Schedule sources

The schedule was captured on **2026-11-23** from myUNW → Public Safety →
Shuttle Schedule. The page itself says it was **updated 2026-10-12**. The finals
timetable comes from the linked **Spring 2024** finals PDF.

| App label | Physical stop | Source column |
| --- | --- | --- |
| RAM | MJMC / Ramseyer Hall | Ramseyer |
| Akenson | Akenson Hall | Akenson |
| Rosedale | Rosedale Square (off campus) | Rosedale |
| Lower Riley | Lower Riley parking lot | Lower Riley |
| The Billy (regular) | Berntsen Library / Totino Fine Arts | BRC / Totino |
| The Billy (finals) | Graham Commons | Graham |
| Ericksen | Ericksen Center | Ericksen (request only) |

Source caveats that are reflected in the app:

- There is no Wilson Center stop in the published table.
- Ericksen is request-only; call **651-631-5310**.
- Public Safety's page says the shuttle does not operate during breaks,
  holidays, or chapel. The published table still lists mid-morning trips, so
  the app follows the table; confirm with Public Safety if a chapel-time trip
  matters.
- The final regular trip and the final finals trip end with a **drop-off only**
  at BRC / Totino. There is no published departure time for that leg, so the
  moving map estimates its arrival at +2 minutes. The countdowns never invent a
  departure for it.
- The finals PDF prints the 11:00 row as **11:00 PM**. The surrounding rows are
  10:15 AM and 12:32 PM, so the app uses **11:00 AM** and flags the correction.
- The evening shuttle runs **6:00 PM–12:00 AM** but has no timetable on the
  page. The app shows the window as a note and does not count down to it.

The academic calendar drives closures and finals. It is in
`src/data/calendar.ts`, currently covering through **2027-03-29**. Update that
file when the next academic year is published.

This is an unofficial project. It is not affiliated with UNW or Public Safety.
Schedules can change; verify with the university before relying on a trip.

## How it works

```text
src/data/schedule.ts   published trips, MWF / Tue–Thu / finals
src/data/calendar.ts   closures and finals windows
src/data/route.json    smoothed route variants + stop distances
src/data/campus.json   OSM buildings, roads, water, campus boundary
        │
        ▼
src/lib/schedule.ts    pure engine: service day, departures, next service,
                       bus phase, position along the route
src/lib/time.ts        America/Chicago wall clock and formatting
        │
        ├── src/components/   countdowns, timetable, 2D SVG map
        └── src/scene/        Three.js campus, route, animated bus
```

- `MWF` and `Tue/Thu` are separate published timetables.
- A trip with a Rosedale time uses the **via** route. A trip without it uses the
  **bypass** route.
- `busStateAt(now)` returns one of `in-service`, `returning`, `parked`, or `off`.
  Between trips the bus is animated back to Ramseyer; the return leg is not a
  published trip and never affects a countdown.
- The map geometry is baked. Campus footprints, buildings, water, and roads
  came from OpenStreetMap; the route is a smoothed driving line through the
  published stops. There is no Overpass/OSRM call at runtime.
- The 2D SVG map and the 3D scene read the same route and campus JSON, so they
  cannot disagree about where the bus is.
- The 3D scene is lazy-loaded; the countdowns and the 2D map paint before the
  Three.js chunk arrives. Use **Whole route** inside the 3D map to frame
  Rosedale.

## Tests

`pnpm test` runs the engine tests in `src/lib/schedule.test.ts`:

- service-day selection across MWF, Tue/Thu, finals, weekends, Thanksgiving,
  Christmas, MLK, mid-semester break, and Easter recess;
- trip counts and monotonic stop times;
- Rosedale via/bypass selection;
- the finals 11:00 PM typo correction;
- countdowns, next-service rollover, finals Billy stop;
- bus phases, return-to-Ramseyer behavior, and route geometry.

The UI and 3D scene were checked in Chromium with a real WebGL context.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds, and
publishes `dist/` to GitHub Pages. The Vite `base` is `./`, so the same build
works at a project path (`/unw-shuttle/`) and locally.

If Pages is not enabled yet: repository **Settings → Pages → Build and
deployment → Source: GitHub Actions**.

## Credits

- Schedule: University of Northwestern – St. Paul, Public Safety.
- Campus map data: © OpenStreetMap contributors, available under the
  [Open Database License](https://opendatacommons.org/licenses/odbl/).
- Route geometry: generated once with OSRM from the published stop list; the
  app makes no routing requests at runtime.

## License

MIT. Schedule data belongs to the university; the app is an independent,
unofficial interface to publicly posted times.
