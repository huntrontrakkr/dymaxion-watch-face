# Pebble app-store listing

Name: **Dymaxion**  
Developer: **Segfaultgolf**\
Type: **Watchface**  
Platform: **Pebble Time 2 / Emery**  
Website: https://huntrontrakkr.github.io/dymaxion-watch-face/  
Source and support: https://github.com/huntrontrakkr/dymaxion-watch-face

## Published listing

[Dymaxion on the Pebble Appstore](https://apps.repebble.com/6d7f75de20c3406198a5abd6)
is public as version **0.3.5**, published September 25, 2026 (UTC), with six
Emery screenshots. The public API confirms the release, publisher and platform.
Rebble requires a separate submission; no Rebble listing is published yet.

## Description

A little world. A wider view.

Dymaxion is a planetary watch face for Pebble Time 2. A connected-world map
follows the sunlight around Earth, with night-side city lights and markers
for the places that matter to you.

Keep your time and three other places in view, with automatic daylight-saving
changes. Extra times can appear on the map when the bottom panel is showing
something else. A +1 or -1 beside a place means tomorrow or yesterday there.

Make it yours with 25 palettes, custom colors, eight clock styles and two
compositions. Adjust positions, map details, your city label and the small
moon, Bluetooth and battery indicators.

Choose bottom panels for world clocks, weather, a two-week calendar, humidity,
NOAA tide predictions or Pebble Health. Switch with optional wrist flicks,
use timed rotation, or keep one panel in place. Tide predictions require a
supported NOAA station. Weather, tides and automatic city lookup need a phone
connection to refresh; Health data stays on the watch.

Minute animations and panel transitions are optional. Daylight-update intervals,
night saver and low-battery motion settings let you choose how much movement
you want.

Configure directly in the Pebble app, or explore the web workshop and import
your layout. Open source. Designed for Pebble Time 2 / Emery only.

Screenshots show example weather, tide, city and device-status values.

## Submission assets

Use the latest release's `dymaxion.pbw` and `dymaxion-store-kit.zip`. The kit
contains the package, this description, six 200 x 228 PNG screenshots,
their importable settings, and checksums. Novelty palettes are excluded.

Manage the existing listing in the
[Pebble developer dashboard](https://developer.repebble.com/dashboard).
The SDK also supports `pebble login` followed by `pebble publish` for future
releases; its `--screenshots` files must
start with the platform name, as the kit's `emery_*.png` files do.

Publish the same package and screenshots separately through the
[Rebble developer portal](https://dev-portal.rebble.io/), using **segfaultgolf**
as the public developer name there too. Rebble accepts up to five screenshots
per platform; use screenshots 01, 02, 03, 05 and 06 from the kit. The Pebble CLI
targets Pebble's store.

The release also includes `dymaxion-rebble-kit.zip`, with exactly those five
screenshots, the PBW, description, release notes and step-by-step portal fields.

The repository, workshop and GitHub releases are public independently of an
app-store listing. A GitHub release does not submit the watch face to the store.
