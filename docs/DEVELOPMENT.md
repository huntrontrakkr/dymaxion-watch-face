# Development guide

## Run the workshop

Requires Node.js 20.19+ (tested with 24) and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Drag components directly on the watch, or
select an element and set its x/y coordinates. Arrow keys move the selected
element one pixel; Shift moves five. The solar slider previews a different time
without changing the watch's actual clock. Settings are saved in this browser.

Use **Export settings** to save a JSON file. In the face's settings inside the
Pebble phone app, open **Import settings from the workshop** and select that
file (or paste its JSON). Save to watch. You can also configure the face entirely
in the bundled phone page, including palette previews, 51 saved cities, exact
positions and custom coordinates. Worldwide city search uses Open-Meteo's
GeoNames search service; the rest of the settings page works offline.

```sh
npm run build                  # static workshop in dist/
```

`dist/` may be hosted at any static-site path; assets use relative URLs. The
browser preview uses the same map resources and time-zone database as the watch
companion. Battery/connection values in the browser are explicitly sample values.
Bottom charts initially use labeled examples. **Load live data** fetches weather
for a configured place and tides for the selected NOAA station. The phone
companion only sends real provider data. See [bottom panels](PANELS.md) for
the chart conventions, station coverage, caching and interaction details.

## Reproduce the gallery

With the workshop running, capture all native-size screens and their
importable settings, plus the README sheets:

```sh
npx playwright install chromium
npm run gallery
# For another server, set PREVIEW_URL=http://127.0.0.1:4174/ before the command.
```

`tools/gallery-configs.mjs` uses a fixed seed, dates and time zone. It creates three examples per palette plus the default face, preserving earlier
IDs when palettes are appended. It covers every clock and panel, using safe compositions with varied places and
display options. `tools/capture-gallery.mjs` freezes each preview's clock,
captures the actual 200×228 canvas and rejects non-RGB222 pixels. Weather,
tides, Health and status values are examples. The files in
`designer/public/gallery/` are published with the workshop; `gallery.html`
filters the collection and offers each settings JSON for download.

Core tests check coverage, reproducibility, import validation, image dimensions
and distinct frames. The gallery browser test checks filters, mobile widths,
loading errors and a download/import through the real workshop controls.

The GitHub Pages workflow builds and tests `main`, then publishes only `dist/`.
Local development, imported settings and the bundled phone page also work
without the hosted workshop.

## Build and run the native face

Install the [Pebble SDK](https://developer.repebble.com/sdk/). Resources and the
generated phone companion are checked in, so an ordinary native build needs no
root npm install or Python asset tooling:

```sh
cd watchface
pebble build
pebble install --emulator emery  # add --vnc in a headless environment
# Or use your phone's developer connection:
pebble install --phone <phone-ip>
```

The installable file is `watchface/build/watchface.pbw`. Target: Emery only,
200×228 pixels, 64 colors. For version 0.4.3, SDK 4.33.1 reports 101,173 bytes of resources and a
61,987-byte code/static-RAM footprint, leaving 69,085 bytes for the heap before
runtime allocations. The map bitmap and active clock resources use that heap.
The selector icon adds 249 resource bytes and no app RAM compared with 0.4.2.
The settings preview runs on the phone and adds no watch rendering or sensor activity.
See the [native power profile](POWER-PROFILE.md) for measured rendering
costs, the animation optimization, and the assumptions behind the battery model.

The project also remains compatible with opening the `watchface` folder in the
[Pebble Browser Emulator](https://github.com/huntrontrakkr/pebble-browser-emulator).
That browser emulator integration has not been exercised in this revision.

## Development and verification

```sh
npm ci
npx playwright install chromium
npm run generate              # map, markers, palette, status, triangular display, caps, defaults
node tools/generate-chart-axis.mjs # compact chart numerals and layout constants
npm run generate:clock        # rounded pixel masters and native transition geometry
npm run generate:chamfer      # Chamfer masters, packed resource and native layout
npm run generate:system       # Pebble system-font preview glyphs and placement
npm run companion             # phone bundle, including offline configuration HTML
npm test                      # projection, DST, solar, providers, native packets/calendar/flick guard
npm run dev                   # keep running in another terminal
npm run test:browser          # desktop/mobile UI and simulated Pebble bridge
```

Typography preparation is separate. The Draft and Span generator verifies every glyph against its pixel master; the reference tool prepares the comparison families, and the workshop's wordmark has its own pixel drawing:

```sh
uv run --with fonttools==4.60.0 --with freetype-py==2.5.1 --with pillow==11.3.0 --with cairosvg==2.8.2 tools/generate-draft.py
uv run --with fonttools==4.60.0 --with freetype-py==2.5.1 tools/prepare-watch-type.py
uv run --with pillow==11.3.0 tools/generate-wordmark.py
uv run --with pillow==11.3.0 tools/generate-menu-icon.py
npm run companion
```

The eight lunar phases and Bluetooth rune are drawn at their final pixel size
in `shared/` and packed into a native C table by `npm run generate:status`.
The watch selector uses `watchface/resources/images/menu-icon.png`, a transparent
25×25 faceted globe in blue and amber. Its pixel master lives in
`tools/generate-menu-icon.py`; the manifest marks it as `menuIcon`. It is a static
launcher resource and adds no watchface drawing or sensor work.
Rounded broad numerals animate only during their 400 ms minute transition;
there is no continuous animation or additional sensor.
Run `pebble clean` before building after changes to the package version,
AppMessage keys or resources, so the PBW includes the current metadata.

Tests require a host C compiler (`cc`). Playwright may require its documented
Linux runtime libraries. The current build has passed the core C/JavaScript
tests, browser suites and native Emery SDK emulator checks. The optimized
minute renderer also matches the previous renderer pixel-for-pixel across
252,384 sampled frames under memory and undefined-behavior sanitizers.
The [verification report](POWER-PROFILE.md#method-and-validation) covers
all clock styles, partial redraws, overlapping animations, Quick View and
power-saving paths.
Physical hardware and an actual phone webview have not been tested.

Version 0.4.0 passed 74 core tests and seven browser suites. The settings tests
cover 25 palette previews, eight clock styles, both compositions, keyboard and
touch city selection, delayed/offline search, configuration saves, and widths
from 320 to 1100 pixels. Live city search was also exercised from the bundled
data-URL page. The compressed release PBW installed and rendered in the native
Emery SDK emulator.

## Publish an update

Every pull request and push to `main` runs the release workflow: core
C/JavaScript tests, desktop and phone browser tests, a production website build,
and a clean Emery build using SDK 4.33.1 and `pebble-tool` 5.0.40. The separate
Pages workflow publishes the workshop from `main`.

Publish a watch update when it is ready by giving it a new version tag:

```sh
# Write the user-facing changes in releases/v0.4.1.md first.
npm run release:prepare -- 0.4.1
npm run companion
git add package.json package-lock.json watchface/package.json releases/ watchface/src/pkjs/index.js
git commit -m "Prepare Dymaxion 0.4.1"
git push origin main
git tag v0.4.1
git push origin v0.4.1
```

Commit any implementation changes before the version tag. The workflow checks
that the tag matches the root package, lockfile, native metadata and PBW, and
that the commit belongs to `main`. After verification it submits the **same
tested artifact** to the existing Pebble listing and creates a GitHub release
with the PBW, release notes and SHA-256 checksum. A plain push to `main` updates
the website and runs checks; only a version tag publishes a watch update.

The description under `## Description` in `docs/STORE-LISTING.md` is the source
for store copy. Publishing updates that text while preserving screenshots and
release history, then downloads the public PBW and verifies its checksum.
The Pebble refresh credential lives in the encrypted repository secret
`PEBBLE_FIREBASE_REFRESH_TOKEN`. It is used only by the publishing job; no
credential belongs in source control or workflow output.

If publication fails after upload, use GitHub's **Re-run failed jobs**. The
publish job reuses the verified artifact and recognizes an already uploaded
version. Rebuilding an already published version may produce a different
archive checksum; use a new version for changed code instead of overwriting
the old one. The workflow refuses downgrades or a conflicting existing package. Public-store
verification bypasses the API’s five-minute response cache, so successful
uploads are not mistaken for missing releases.

For a local release check:

```sh
npm run companion
cd watchface
pebble clean
pebble build
cd ..
python3 tools/release.py package
python3 tools/release.py check --tag v0.4.1
```

The packaged `release-artifacts/dymaxion.pbw` uses ZIP compression to keep the
bundled phone page and source maps within the store's upload limit. Every
uncompressed SDK archive member is verified byte-for-byte, including native
binaries, resources, source maps and manifests.

## Earlier validation

The 0.3.0 palette/gallery update passed 70 core tests, five browser suites and
a production build served under the same project subdirectory as GitHub Pages.
All seven new palettes were also applied to the native Emery emulator and
checked again after restarting the watch app: the background, figures, and
both day/night land and water colors matched the RGB222 definitions in all
14 checks. The gallery contains 64 distinct, native-resolution frames.

## Source guide

| Source | Responsibility |
| --- | --- |
| `shared/map.js` | Preserved original Gray net and gnomonic coordinate mapping |
| `shared/markers.js` | Five original 5×5 map-glyph pixel masters and legacy-ID migration |
| `shared/settings.js` | Themes, presets (Meridian, Horizon), locations, bounds, validation |
| `shared/chamfer-numerals.js` | Chamfer figure masters (zone numerals ×3, 45° cuts) and clock strip |
| `shared/protocol.js` | Named time zones → compact native packet |
| `shared/solar.js` | Solar direction model used by the workshop |
| `shared/moon.js` | UTC lunar phase and eight native-size glyphs |
| `shared/status-glyphs.js` | Pixel Bluetooth connection rune |
| `shared/display.js` | Numeral styles and the display packet |
| `shared/map-background.js` | Triangle points and lines behind the map |
| `shared/zone-column.js` | Place times beside the clock (mirrored by `zone_column.c`) |
| `shared/health.js` | Health drawer layout (mirrored by `health.c`) and workshop example day |
| `shared/power.js` | Daylight update interval, animation switches and night saver (mirrored by `power.c`) |
| `shared/transitions.js` | Tray swipe and beside-the-clock transitions (mirrored by `transitions.c`) |
| `shared/nameplate.js` | The optional Dymaxion nameplate (mirrored by `nameplate.c`) |
| `shared/map-markers.js` | Close markers side by side (mirrored by `map_markers.c`) |
| `shared/map-times.js` | Place times on the map: 3×5 to 4×8 figures, placement and leaders (mirrored by `map_times.c`) |
| `shared/city.js`, `tools/location-service.js` | City naming, hourly reverse geocoding and offline cache |
| `shared/place-search.js`, `shared/extra-places.json` | City search, editable code suggestions and saved places |
| `shared/panel-*`, `shared/calendar.js` | Panel controls, provider normalization, packet contract and preview |
| `designer/` | Interactive preview, accessible controls, JSON import/export |
| `tools/mobile-config.*` | Offline phone settings page |
| `tools/config-preview.js` | Native-pixel phone preview using shared map, font and panel assets |
| `.github/workflows/release.yml`, `tools/release.py` | Tested, versioned publication to Pebble and GitHub |
| `tools/companion.js` | Pebble bridge, persistence and retried synchronization |
| `tools/environment-service.js` | Weather/NOAA requests, caches and failure backoff |
| `tools/generate-*` | Reproducible map/font/data resources |
| `watchface/src/c/` | Native renderer, services and validated settings reader |

Read [the map-glyph notes](MARKERS.md) for sizing, migration and color
rules, [the design and typography notes](DESIGN.md) for research and current
bounds, and [the protocol notes](PROTOCOL.md) for the
watch/phone contract. The default seed is January 2026; the companion refreshes
it with the current time and IANA data on connection. Its next eight transitions
keep each remote clock working offline. Expired transition caches show `?`.
