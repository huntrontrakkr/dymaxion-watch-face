# Drawing the map less often, and less of it

29 September 2026, for [0.7.0](../releases/v0.7.0.md). There are three changes:

- A minute tick no longer repaints the map.
- A relight repaints only the tiles the terminator can reach.
- The Sun and Moon markers are projected rather than searched for.

Every change keeps the watch's pixels exactly as they were. The rest of this
document explains how each one is checked.

## 1. A minute tick paints only what a minute changes

Before, every minute repainted the whole face: the 200×104 map bitmap, the
Sun, the lights, the Moon, the markers and all the panels. Now `minute_redraw`
in `main.c` repaints only four things:

- the status bar;
- the clock;
- the bottom tray;
- the nameplate strip, when place times sit between the clock and the map.

The whole face is still painted in these cases:

- when the map has just been relit;
- while the markers pulse;
- when the visible height changes (Quick View);
- when place times sit on the map;
- when any marker has moved, for example when your city goes stale.

The emulator job in CI checks this on the watch itself. For each of ten
set-ups, it screenshots the face after a real minute tick. It then resends the
same settings, which forces a full paint, and screenshots again. The two
screenshots must match to the pixel. Five of the set-ups tick on an ordinary
minute and five on a relight minute. The results are in the "A minute tick
against a full paint" table of the job summary.

## 2. A relight reads and repaints only what can change

The terminator moves about a pixel every few minutes. On its interval, the old
relight did the following:

- read all of `map-0.bin` (83,200 bytes, in 104 reads);
- took the dot product of the Sun with each of the 20,800 stored directions;
- rewrote every pixel.

Most of that work reproduced pixels that could not have changed.

`tools/generate-map-light.mjs` now writes a second resource, `map-light.bin`
(56,775 bytes). It is built as follows:

- The map is divided into 8×8 tiles. The 231 tiles that hold map pixels are
  each split into 2×2 sub-tiles.
- Each tile and sub-tile stores a centre direction C and a radius r. C is the
  rounded mean of its stored directions. r is the largest distance from C to
  any of those directions, rounded up.
- The file also stores each tile's flags, then its directions in sub-tile
  order. A tile that only needs repainting is fetched with one short read of
  its flags. A tile that straddles a threshold is fetched with one read of its
  whole block.

For a Sun S, every pixel's light N·S lies within S·C ± ⌈|S|⌉·r. That gives each
tile and sub-tile one of four classes:

| Class | When | What gets painted |
|---|---|---|
| Day | The whole range is at or above sunrise | Day colour |
| Night | The whole range is below civil twilight | Night colour |
| Checker | The whole range lies between the two | The checkerboard, from (x+y)&1 |
| Mixed | Anything else | Pixel by pixel |

`map_light.c` remembers each tile's class. A tile whose class is unchanged, and
not Mixed, is neither read nor painted. Only the pixels of Mixed sub-tiles are
lit one by one. The bounds are computed from the integer directions the watch
actually stores, so the result is exactly the dense rule, not an approximation.

The full rebuild is still used at launch, after a settings or palette change,
and whenever a relight's read fails. Each full rebuild ends by classifying the
tiles for the relights that follow. With day-and-night shading off, a relight
only moves the Moon.

### Measured on the host

`tests/map-light.test.mjs` builds `tests/map-light-test.c` against
`map_light.c`. After every relight, it checks every map pixel against the dense
rule. Every run had zero mismatches.

| Relights | Reads | Bytes | Dot products | Pixels painted |
|---|---:|---:|---:|---:|
| Before, every relight | 104 | 83,200 | 20,800 | 20,800 |
| Every 5 minutes, 3 days in each of 3 seasons | 62 | 13,368 | 1,508 | 2,439 |
| Every 2 hours for a year | 97 | 14,483 | 1,509 | 4,067 |
| 3,000 arbitrary Suns | 171 | 16,863 | 1,509 | 7,564 |

Each figure is an average per relight. A relight five minutes after the last
one reads about a sixth of the bytes and does about a fourteenth of the
multiplications. It also repaints about an eighth of the pixels.

### Why integer bounds rather than a float conic scanline

The reference scanline in the attached zip solves, for each row of each
triangle, where the terminator's conic crosses the row. It widens the answer by
a rounding band and lights the band pixel by pixel.

That solve is sound, but the watch's app code has no floating-point unit.
Every square root and division runs in software, and a relight would need
about 2,600 quadratic solves. That costs more than the integer loop it
replaces.

Tile bounds reach the same result, "light only near the terminator", with one
integer dot product per tile or sub-tile. They also need no rounding band,
because the bounds come from the stored data itself. Classifying the
checkerboard band as its own class gives the "two interleaved thresholds"
without per-pixel work.

## 3. The Sun and Moon are placed by projection

The old code searched the map on every rebuild. It found the brightest pixel
for the Sun marker, and the pixel closest to the Moon's direction for the Moon
marker, which cost a second pass over the map.

`tools/generate-map-net.mjs` now writes the net as small integer tables. These
are the 12 vertices, the 20 faces, and the 22 placements with their LCD sixths
and pixel corners. `map_net.c` projects a direction straight onto the map:

1. Find the nearest face.
2. Find its sixth.
3. Intersect the direction with the face's plane to get barycentric
   coordinates.
4. Map those onto the placement's pixel corners.

The previews use `shared/map-net.js`, which does the same with the same
numbers. `tests/map-net.test.mjs` checks two things:

- a projected point lands within about a pixel (2.1°) of the map pixel that
  holds it;
- the watch and the previews agree. The few points where they differ sit on a
  seam or a pixel edge, and both answers pass the first check.

## Measured in the emulator

`.github/workflows/energy.yml` builds the base (0.6.0) and this version, then
installs them in turn in one Pebble emulator: before, after, before, after.
QEMU logs every block it translates, and the workflow turns on execution
logging only for nine-second windows (`tools/energy/`). Those windows cover
an ordinary minute change, a relight minute (the default five-minute
relight) and an idle stretch, which is subtracted as background. Every
executed Thumb instruction is counted, firmware included: drawing, flash
reads and the display driver.

| Instructions, over idle | 0.6.0 | 0.7.0 | Change |
|---|---:|---:|---:|
| Ordinary minute change | 3,850,747 | 3,484,931 | −9.5% |
| Relight minute | 6,584,876 | 4,171,833 | −36.6% |
| A day: 1,152 minute changes and 288 relights | 6.33 billion | 5.22 billion | −17.6% |
| Of a minute change, in the app | 775,369 | 820,438 | +5.8% |
| Of a minute change, in the firmware | 3,075,378 | 2,664,493 | −13.4% |
| Of a relight minute, in the app | 1,478,788 | 923,783 | −37.5% |
| Of a relight minute, in the firmware | 5,106,088 | 3,248,050 | −36.4% |

Idle windows matched between the builds to 0.1% (3.67 million
instructions each), and repeated windows within a build agreed to about 1%.
The figures are medians of six windows per build.

What the numbers say:

- **The relight** saves the most. The largest single drop, about 850,000
  instructions, is in one 4 KB page of firmware code (0x22000). The
  likeliest cause is the smaller reads (about 13 KB instead of 83 KB), but
  without firmware symbols that is not confirmed.
- **The minute change** saves about a tenth. Skipping the map saves work in
  Pebble's drawing code. The app's own minute work is almost all the clock's
  flip animation, which is unchanged. It rose 6%; the cause has not been
  traced.
- **Reading order matters.** The first version of the relight read its tile
  table in chunks between tile reads, moving back and forth in the file. That
  made the relight cost more than the dense rebuild. It now reads the table
  once, and every later read moves forward.

A day's saving is about 1.1 billion instructions. At 1–4 cycles per
instruction, 192 MHz and 7.36 mA active (the assumptions in
[POWER-PROFILE.md](POWER-PROFILE.md)), that is roughly 0.01–0.05 mAh a day:
a small share of the watch's daily use, which the display, Bluetooth and
sleep current dominate.

These are instruction counts, not current. Flash, display and radio energy
are not modelled, and firmware that waits on emulated devices spins for as
long as the host takes, which is why both builds are measured on one
machine. Some addresses (240 of them) were translated more than once with
different lengths, as code was reloaded. Each execution is counted with the
translation in force when it ran.
