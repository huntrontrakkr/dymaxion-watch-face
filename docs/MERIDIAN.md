# Meridian and the Geodesic figures

September 2026. Meridian is the default composition for new installs; Atlas and
Horizon remain one tap away, and saved faces keep exactly what they had.

| Previous default (Atlas, broad numerals) | Meridian (Geodesic figures) |
| --- | --- |
| ![Previous Atlas](../output/meridian/previous-atlas-airocean.png) | ![Meridian](../output/meridian/meridian-airocean.png) |
| ![Previous Atlas, Paper](../output/meridian/previous-atlas-paper.png) | ![Meridian, Paper](../output/meridian/meridian-paper.png) |

## What was wrong

The map was right. The trouble was everything competing with it.

- **Too many voices.** The top 60 pixels held a 1950s script nameplate, an
  ultra-extended arcade numeral, and a mixed-case caption with oldstyle
  figures: three typographic eras in one glance.
- **Numerals stretched to fill the width.** Filling 196 pixels with four
  32-pixel figures made them twice as wide as they are tall. Eight-pixel
  horizontals left four-pixel slits for counters, so 3, 5, 6 and 8 read as
  blocks. The full-foot 1 left a hole in any time that contains it.
- **Floating bands.** Clock, map and zones sat in three bands separated by
  dead space, so the map read as a picture placed between two labels rather
  than the ground everything stands on.

## What changed

**Geodesic figures.** A new monoline clock set: one stroke weight, true
circles for bowls, and every diagonal at exactly 60°, the angle of the
icosahedral net's triangle edges. The 4, 6, 7 and 9 now share an angle with
the map beneath them; the 1's flag is a small lattice triangle. The figures
are 56 pixels tall, 75 percent taller than before, and narrower, so they
read at a glance with open counters and 17 pixels of air on each side.
See the [construction study](../designer/geodesic-study.html).

**A status line instead of a nameplate.** The watch does not need to say its
own name. Date and city move to the top line in Draft Micro's lining capitals,
beside the Moon, Bluetooth and battery marks that were already there. The
caption row under the clock disappears and the clock gains its height.

**One rhythm.** Status line, clock, map and zones now stack with even
10–12 pixel gaps: 20–76 figures, 86–177 map ink, zones from 189. The map
sits directly under the time it explains.

**Still the same instrument.** The same map, palettes, places, panels,
minute flip and settings. Choosing Geodesic in Atlas or Horizon uses
positions fitted to the taller strip; switching numerals keeps whichever
composition you are in.

## Engineering notes

- Figures sit in fixed 34-pixel tabular cells in a 200 × 64 strip. The 56-pixel
  cap is exactly seven rows of the minute flip's 8-pixel lattice, so the
  400 ms triangle flip works unchanged and only changed figures move.
- Pebble limits an app's static image to 64 KB and the face was already at
  62.8 KB. Geodesic's masters and flip lattice (12,020 bytes) and the
  status-line capitals (1,602 bytes) are raw resources loaded into the heap
  only when used; the flip buffers moved from static memory to the heap for
  both faces. An ARM cross-compile of the app sources measures 2,671 bytes
  *less* static memory than before.
- The watch finds lattice cells by binary search over per-row runs instead of
  a 25 KB lookup table. Host tests compare native frames, read from the packed
  resource, with the browser at every sampled stage of seven transitions, and
  the status-line capitals pixel for pixel.
- Display code 4 is Geodesic; code 3 remains the retired LCD style, which the
  watch still migrates to broad. Flag 64 in the settings packet is the status
  line.

## Reproduce

```sh
npm run generate:geodesic          # masters, resource, native layout (Playwright)
npm run generate                   # includes the status-line capitals
node output/meridian/capture.mjs   # with npm run dev running
```

Physical hardware and the SDK emulator have not been run for this revision;
see the README for what has been verified.
