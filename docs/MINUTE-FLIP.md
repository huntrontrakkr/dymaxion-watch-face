# Minute transition

Every horizontal numeral style uses a **400 ms** transition on each
adjacent minute change: the triangles over the changed figures shrink away and
uncover the new time. It replaces the earlier hinge flip. All styles share one
implementation (`shared/minute-flip.js`, `watchface/src/c/minute_flip.c`) with
a small per-face descriptor. It renders the old and new time into two binary 200 × 40 frames, compares
their pixels, and selects only the equilateral tiles containing a difference.
The lattice is a single row of triangles as tall as the figures (36 pixels for
Chamfer, 32 for broad), close to the scale of the map's own faces: 34 and 37
tiles across the strip.

Chamfer and broad have four fixed numeral slots, and only slot pixels may
change. Span, the Pebble system fonts and Leco Delta
have no slots (proportional fonts re-centre as the time changes), so they
borrow Chamfer's 40-pixel strip and lattice and let any strip pixel change.
Their masks come from `shared/clock-styles.js` and
`watchface/src/c/clock_styles.c`, which emit the same horizontal runs; the
watch draws those styles from the same runs when the transition is off.
With place times beside the clock, the same strip is drawn 36 pixels to the
right (or left); the transition itself is unchanged.

Each selected tile keeps the old drawing in the face's own ink and ground and
shrinks toward its centroid, taking its contents with it, until it vanishes into
the new frame underneath. The scale eases in along a cosine. Each tile moves for
320 ms; a left-to-right stagger adds at
most 80 ms. There is no secondary settling animation. Tiles without a changed
pixel stay still; a changed tile can cover part of a neighbouring figure or the
colon, which shrink with it and reappear unchanged behind. No shading is
added: the motion alone separates old from new.

The horizontal main clock uses this motion in every style. Zone clocks and stacked Draft time
keep their existing rendering. Chamfer figures are the default for new
settings; existing explicit Span/triangle choices are preserved.

## Runtime

- The existing minute tick starts the native transition. A temporary timer runs
  only during the 400 ms transition and is cancelled on completion, settings
  changes, focus loss, or teardown. Late callbacks use elapsed time and settle
  immediately when the deadline has passed.
- `Brief animations` controls the minute flips, the marker pulses, the tray
  swipe and the clock's glide beside the place times.
  Native motion is suppressed at 10% battery or below by default (5, 10, 20 or
  30%, **Stop animations at**); crossing that threshold
  cancels an in-progress flip. Each frame after the first repaints only the clock
  strip; the rest of the screen keeps the minute tick's frame. The browser also honors reduced motion and settles
  immediately when its page is hidden.
- Launch, settings changes, and discontinuous time jumps show the correct time
  immediately. The browser schedules its idle clock refresh at minute boundaries.
  No tap, touch, accelerometer, or phone request is added by this animation.
- Masks, tile flags and the two-bit animation frame are allocated in the heap
  for the active face only: 4,074 bytes for broad, 4,068 for the others. Broad's
  masters and lattice are static tables; Chamfer's are a 2,350-byte raw
  resource loaded only while it or a slotless style is shown. The font styles
  also load one font's figures (817–903 bytes) from the `clock-glyphs.bin`
  resource; if the heap cannot hold them, the watch draws the time from the
  firmware font without the transition (Leco Delta as plain Leco), and the watch finds a pixel's tile by
  binary search over per-row runs instead of a lookup table. The runs avoid an
  additional full-strip ownership table. The map bitmap is reused during
  animation frames.
- Native samples expand the destination mask with a packed lookup and only
  inspect the bounds of the changing tiles, computed once per transition.
  These bounds include the tiles' blank pixels, so the shrink stays identical.
  See [the native power profile](POWER-PROFILE.md) for the measured CPU savings.

## Sources and verification

`shared/minute-flip.js` and `watchface/src/c/minute_flip.c` use identical Q8 tile
centroids, integer inverse scaling and a cosine lookup. `npm run generate:clock` exports the current rounded
pixel masters and geometry to native tables; this preparation step needs the
installed Playwright browser. Ordinary Pebble builds use the generated assets.

`npm run generate:chamfer` cuts the zone masters and packs its
resource. `npm test` checks all 1,440 adjacent minute transitions for Broad and Chamfer, untouched tiles,
shrinking areas, endpoints, the 400 ms schedule, and native/browser frame equality for ordinary
minutes, hour carries, midnight, and 12-hour rollovers, in every style.
`tests/minute-flip-browser.mjs` exercises the live minute trigger in every style, reduced motion,
disabled motion, idle behavior, time scrubbing, and the responsive replay study.
Workshop captures, real speed and 4× slower:
`output/meridian/minute-shrink.gif`, `output/meridian/minute-shrink-slow.gif`.
The shrink has been verified in the Emery emulator in all eight styles,
including overlapping motion, Quick View and power-saving paths. Hardware
battery consumption has not been measured; see [the profile](POWER-PROFILE.md).

`output/minute-flip-study/` records the retired hinge flip: its replayable study
(`minute-flip.html`, built with `node output/minute-flip-study/build.mjs`) and
the emulator capture `native-minute-flip.gif`. It bundles its own copy of the
old code and is kept for comparison.
