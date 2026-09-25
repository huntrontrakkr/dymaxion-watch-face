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

I've always liked Buckminster Fuller's Dymaxion map. It folds the whole planet out into triangles so the continents stay in one piece, and I wanted it on my wrist.

The map lights up with real daylight. You can watch the night side creep across it, and city lights come on after dark.

I keep a few time zones for friends and family. They can sit in the panel at the bottom, next to the clock, or right on the map beside their cities.

The bottom panel can also show the weather, a two-week calendar, humidity, tides (US NOAA stations) or Pebble Health. Flick your wrist to switch, put it on a timer, or turn on Smart and it'll show the rain before it gets to you.

There are 25 color palettes, or make your own, and eight clock styles. The settings page on your phone previews everything before you save.

It's easy on the battery. The map only redraws every few minutes, and you can have it rest at night or during Quiet Time.

Pebble Time 2 only for now. Weather uses your phone's location. Health data never leaves the watch. The weather in the screenshots is sample data. It's open source, and bug reports are welcome.

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
