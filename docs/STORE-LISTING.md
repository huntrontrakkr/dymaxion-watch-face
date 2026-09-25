# Pebble app-store listing

Name: **Dymaxion**  
Developer: **Segfaultgolf**\
Type: **Watchface**  
Platform: **Pebble Time 2 / Emery**  
Website: https://huntrontrakkr.github.io/dymaxion-watch-face/  
Source and support: https://github.com/huntrontrakkr/dymaxion-watch-face

## Published listing

[Dymaxion on the Pebble Appstore](https://apps.repebble.com/6d7f75de20c3406198a5abd6)
is public, with six Emery screenshots. Version tags publish updates to this
same listing after CI passes. The workflow verifies the public version,
download checksum and description. Rebble publication is deferred.

## Description

Dymaxion is a watch face built around Buckminster Fuller's Dymaxion map, which unfolds the globe into triangles so the continents stay in one connected piece.

The map shows live day and night. The shading follows the sun, city lights come on after dark, and a small sun marks where it is overhead.

Keep three other time zones in view: in a bottom panel, beside the clock in regular or larger digits, or as labels right on the map in five sizes. Daylight-saving changes are handled for you, and each place has its own marker and color.

Bottom panels show world clocks, weather, a two-week calendar, humidity, NOAA tides or Pebble Health. Change panels with wrist flicks or on a timer, or let Smart rotation pick what matters now, like rain on the way or a turning tide.

Choose from 25 palettes or make your own, and from eight clock styles. The phone settings page shows a live preview. Search for any city, or pick from more than 50 saved cities offline.

Battery options include how often the map reshades, a night mode that can follow your Quiet Time, and pausing redraws in the dark until the backlight comes on.

For Pebble Time 2 (Emery). Weather follows your location by default; allow location access in the Pebble app. Search and weather need a connection, and tides need a NOAA station. Health data stays on the watch. Weather and device readings in the screenshots are examples. Open source.

## Submission assets

Each automated GitHub release includes `dymaxion.pbw`, `SHA256SUMS` and release
notes. The original six 200 × 228 store screenshots remain on the listing;
novelty palettes are excluded. The original submission kits are archived with
the [0.3.5 release](https://github.com/huntrontrakkr/dymaxion-watch-face/releases/tag/v0.3.5).

Manage the existing listing in the
[Pebble developer dashboard](https://developer.repebble.com/dashboard).
For future updates, follow [the version-tag release steps](DEVELOPMENT.md#publish-an-update).
The workflow publishes to Pebble first, verifies the public download, then
creates the GitHub release. Creating a GitHub release manually does not submit
the watchface to the store.
