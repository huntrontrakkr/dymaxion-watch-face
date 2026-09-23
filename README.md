# Dymaxion

A watch face for the Pebble Time 2 (200×228, 64-color e-paper) built on
Buckminster Fuller's Dymaxion map. The planet is the clock: the day/night
terminator sweeps across the icosahedral net, city lights come on as each
place goes dark, and a diamond glyph tracks the subsolar point.

## Design

- **Lattice.** Every element sits on a triangular lattice with vertical
  columns. Hexagons are six lattice triangles; everything snaps to lattice or
  frequency-2 grid vertices.
- **Map.** Fuller's icosahedral net in R.W. Gray's canonical placement
  (22 entries, including the split triangles 9 and 16), rendered by
  per-pixel gnomonic inverse mapping from a 0.5° Natural Earth land mask.
  The map runs the full display height, and face edges fall exactly on grid
  lines.
- **Planetary clock.** Terminator with twilight buffer as the clock hand;
  241 population-scaled city lights in three magnitude classes; live
  subsolar glyph; optional solar noon/midnight meridians.
- **Time.** Local time in two large hexagonal vessels (hours above minutes,
  diamond colon). Up to three zones as smaller hex cells, each filling with
  night-ocean color when that city is in darkness. Geometric sans digits,
  upright and undistorted.
- **Palette.** RGB222 (64 colors), with four themes: Airocean, Blueprint,
  Paper, Spaceship Earth.

## Layout

| Path | What it is |
| --- | --- |
| `designer/` | Browser mockup and layout tool that simulates the watch display |
| `watchface/` | Pebble SDK project for the on-watch face |
| `watchface/src/c/` | Native C source (currently a placeholder time display) |
| `watchface/resources/` | Fonts, bitmaps and baked map data for the native face |

## Target hardware

| | |
| --- | --- |
| Watch | Pebble Time 2 |
| SDK platform | `emery` |
| Display | 200×228 px, 64-color (RGB222) e-paper |

Other platforms can be added to `targetPlatforms` in `watchface/package.json`
once the layout has variants for their screen sizes.

## Building the watch face

Requires the [Pebble SDK](https://developer.repebble.com/sdk/) (`pebble` tool,
SDK 4.x).

```sh
cd watchface
pebble build                        # produces build/watchface.pbw
pebble install --emulator emery     # run in the SDK emulator
pebble install --phone <phone-ip>   # install on a watch via the phone app
```

Build output (`build/`, `.lock-waf*`) is git-ignored.

### Browser preview

The face can also be built and run entirely in the browser with
[Pebble Browser Emulator](https://github.com/huntrontrakkr/pebble-browser-emulator):
open **Open from GitHub** with this repository and the app folder set to
`watchface`, or use a link of the form

```text
https://huntrontrakkr.github.io/pebble-browser-emulator/#/github/huntrontrakkr/dymaxion-watch-face?path=watchface&watch=qemu_emery
```

## Status

- **Designer** – the browser mockup is the working reference for layout,
  palette and behavior. Its source has not been added to this repository yet.
- **Watch face** – the SDK project is set up and builds, but `main.c` only
  shows a placeholder digital time. The map, terminator, city lights, hex
  vessels and themes are still to be ported from the designer.

## Roadmap

1. Add the designer source under `designer/`.
2. Bake the Dymaxion land mask and city table into `watchface/resources/`.
3. Render the icosahedral net and terminator natively.
4. Hex time vessels, extra time zones and the subsolar glyph.
5. Theme selection through a PebbleKit JS configuration page.

## License

[Apache License 2.0](LICENSE)
