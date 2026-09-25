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

A watch face built on Buckminster Fuller's Dymaxion projection, which unfolds the globe onto the faces of an icosahedron and keeps the continents as a single connected landmass.

The map is shaded from the sun's actual position, so the terminator moves across it through the day, and city lights appear on the night side. The subsolar point is marked.

Up to three additional time zones can be shown in the bottom panel, beside the main clock, or as labels placed on the map near each city. Daylight saving is handled per zone.

The bottom panel also offers weather, a two-week calendar, humidity, NOAA tide predictions and Pebble Health data. It can change on a wrist flick, on a timer, or automatically based on conditions such as approaching rain or a turning tide.

Twenty-five palettes are included, custom palettes can be defined, and there are eight clock typefaces. The phone settings page renders an exact preview before anything is sent to the watch.

The map is redrawn at a configurable interval rather than every minute, and an optional night mode reduces redraws further, including during Quiet Time.

Requires Pebble Time 2. Weather uses the phone's location. Health data stays on the watch. Weather shown in the screenshots is sample data. Source code is available on GitHub.

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
