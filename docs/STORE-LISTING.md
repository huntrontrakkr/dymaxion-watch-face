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

The map is shaded from the sun's actual position, so the terminator moves across it through the day and city lights come on at night.

Up to three other time zones can sit in the bottom panel, beside the clock, in a line between the clock and the map, or on the map by each city. Daylight saving is handled per zone. A small wireframe icosahedron can sit beside a narrow clock.

The bottom panel also offers weather with sunrise and sunset times, a two-week calendar, humidity, NOAA tides with each high and low marked, and Pebble Health. It can change on a wrist flick, on a timer, or when rain or a turning tide approaches.

The top bar can show the moon, a battery gauge, a Quiet Time mark and a line for the day's steps. Twenty-five palettes, custom palettes and eight clock typefaces are included, and the phone settings page previews every change before it is sent.

Fuller's word for doing more with less was ephemeralization. The map is redrawn at an interval rather than every minute, and a power saver cuts redraws at night or during Quiet Time.

Requires Pebble Time 2. Weather uses the phone's location. Health data stays on the watch. Weather and tides in the screenshots are sample data. Source code is on GitHub.

## Submission assets

The store gallery is `docs/screenshots/store/`: an animated demo first, then
five 200 × 228 stills, all rendered by the workshop at the watch's size and in
its 64 colors. Each release uploads them in place of the listing's screenshots.
To refresh them, run `npm run dev`, then `npm run demo`. The demo GIF must stay
under 1.5 MB; the 2× copy for the README is `docs/screenshots/dymaxion-demo.gif`.

Each automated GitHub release includes `dymaxion.pbw`, `SHA256SUMS` and release
notes. The original submission kits are archived with the
[0.3.5 release](https://github.com/huntrontrakkr/dymaxion-watch-face/releases/tag/v0.3.5).

Manage the existing listing in the
[Pebble developer dashboard](https://developer.repebble.com/dashboard).
For future updates, follow [the version-tag release steps](DEVELOPMENT.md#publish-an-update).
The workflow publishes to Pebble first, verifies the public download, then
creates the GitHub release. Creating a GitHub release manually does not submit
the watchface to the store.
