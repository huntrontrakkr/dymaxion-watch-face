# Pebble app-store listing

Name: **Dymaxion**  
Developer: **Segfaultgolf**\
Type: **Watchface**  
Platform: **Pebble Time 2 / Emery**  
Website: https://huntrontrakkr.github.io/dymaxion-watch-face/  
Source and support: https://github.com/huntrontrakkr/dymaxion-watch-face

## Published listing

[Dymaxion on the Pebble Appstore](https://apps.repebble.com/6d7f75de20c3406198a5abd6)
is public. Version tags publish updates to this same listing after CI passes. The workflow verifies the public version,
download checksum and description. Rebble publication is deferred.

## Description

A watch face built on Buckminster Fuller's Dymaxion map, which unfolds the globe onto the twenty faces of an icosahedron without splitting a continent. Fuller called it a deck plan of Spaceship Earth: one island in one ocean, with no country at the center.

Sunlight crosses the map through the day; city lights come on at night. An optional Moon marks where it is overhead, shaded for its phase. Turn the map 180° while keeping its labels upright.

Up to three other time zones can sit in the bottom panel, beside the clock, between the clock and map, or by each city on the map. Daylight saving is handled per zone.

The bottom panel offers weather, sunrise and sunset, a two-week calendar, humidity, NOAA tides and Pebble Health. Tides follow the nearest supported NOAA station as you travel, or a station you pin. Panels change on a wrist flick, a timer, or when rain or a turning tide approaches.

The top bar has its own Moon, battery gauge, Quiet Time mark and step line. Choose from twenty-five palettes, custom colors and eight clock typefaces, with a preview in the phone settings.

Fuller's word for doing more with less was ephemeralization. The map is redrawn at an interval rather than every minute, and a power saver cuts redraws at night or during Quiet Time.

Requires Pebble Time 2. Automatic city, weather and tides use the phone's location. Health stays on the watch. Screenshot weather and tides are examples. Source code is on GitHub.

## Submission assets

The store gallery is `docs/screenshots/store/`: an animated demo first, then
five 200 × 228 stills, all rendered by the workshop at the watch's size and in
its 64 colors. Each release uploads them in place of the listing's screenshots.
To refresh them, run `npm run dev`, then `npm run demo`. The demo GIF must stay
under 1.5 MB; the 2× copy for the README is `docs/screenshots/dymaxion-demo.gif`.

The listing's banner is `docs/screenshots/store/banner-720x320.png`, with a
1440 × 640 copy for the README at `docs/screenshots/dymaxion-banner.png`. It
shows the net lit at an equinox afternoon, on the triangular lattice its faces
are cut from. The lattice grows finer toward the map, and the wordmark sits
above it, all in the Airocean palette's colors. `npm run hero` redraws both.
Releases do not upload the banner. Set it once in the developer dashboard's
listing editor.

Each automated GitHub release includes `dymaxion.pbw`, `SHA256SUMS` and release
notes. The original submission kits are archived with the
[0.3.5 release](https://github.com/huntrontrakkr/dymaxion-watch-face/releases/tag/v0.3.5).

Manage the existing listing in the
[Pebble developer dashboard](https://developer.repebble.com/dashboard).
For future updates, follow [the version-tag release steps](DEVELOPMENT.md#publish-an-update).
The workflow publishes to Pebble first, verifies the public download, then
creates the GitHub release. Creating a GitHub release manually does not submit
the watchface to the store.
