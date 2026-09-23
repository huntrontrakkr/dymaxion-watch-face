# Minute transition

The Chamfer and rounded broad clocks use a **400 ms** transition on each
adjacent minute change. Chamfer's 36-pixel figures span exactly four rows of a
9-pixel lattice in the same 200 × 40 strip, so both clocks share one
implementation (`shared/minute-flip.js`, `watchface/src/c/minute_flip.c`) with
a small per-face descriptor. It renders the old and new time into two binary 200 × 40 frames, compares
their pixels, and selects only the equilateral tiles containing a difference.
Broad uses the eight-pixel-row lattice from the typography study.

Selected tiles hinge away along a consistent 60-degree edge to uncover the new
frame underneath. Each tile moves for 320 ms; a left-to-right stagger adds at
most 80 ms. There is no secondary settling animation. Unchanged tiles, unchanged
numerals, the colon, and the gaps between figures remain stationary. Facet shading
uses the active RGB222 palette and disappears when the tile finishes.

The horizontal main clock uses this motion. Zone clocks and stacked Draft time
keep their existing rendering. Chamfer figures are the default for new
settings; existing explicit Span/triangle choices are preserved.

## Runtime

- The existing minute tick starts the native transition. A temporary timer runs
  only during the 400 ms transition and is cancelled on completion, settings
  changes, focus loss, or teardown. Late callbacks use elapsed time and settle
  immediately when the deadline has passed.
- `Brief animations` controls both minute flips and the earlier marker pulses.
  Native motion is suppressed at 20% battery or below; crossing that threshold
  cancels an in-progress flip. The browser also honors reduced motion and settles
  immediately when its page is hidden.
- Launch, settings changes, and discontinuous time jumps show the correct time
  immediately. The browser schedules its idle clock refresh at minute boundaries.
  No tap, touch, accelerometer, or phone request is added by this animation.
- Masks, tile flags and the two-bit animation frame are allocated in the heap
  for the active face only: 4,536 bytes for broad, 4,476 for Chamfer. Broad's
  masters and lattice are static tables; Chamfer's are a 6,744-byte raw
  resource loaded only while it is shown, and the watch finds a pixel's tile by
  binary search over per-row runs instead of a lookup table. This keeps the app
  image inside Pebble's 64 KB process limit. The map bitmap is reused during
  animation frames.

## Sources and verification

`shared/minute-flip.js` and `watchface/src/c/minute_flip.c` use identical Q8 hinge
geometry and a cosine lookup. `npm run generate:clock` exports the current rounded
pixel masters and geometry to native tables; this preparation step needs the
installed Playwright browser. Ordinary Pebble builds use the generated assets.

`npm run generate:chamfer` cuts the zone masters and packs its
resource. `npm test` checks all 1,440 adjacent minute transitions for both clocks, stationary regions,
endpoints, the 400 ms schedule, and native/browser frame equality for ordinary
minutes, hour carries, midnight, and 12-hour rollovers.
`tests/minute-flip-browser.mjs` exercises the live minute trigger, reduced motion,
disabled motion, idle behavior, time scrubbing, and the responsive replay study.
The Emery emulator also renders intermediate triangle frames on an actual
12:33-to-12:34 minute tick with `Brief animations` enabled. The native capture is
`output/minute-flip-study/native-minute-flip.gif`; this is emulator verification,
not a measurement on physical hardware.

The replayable study is `output/minute-flip-study/minute-flip.html`, built with
`node output/minute-flip-study/build.mjs`. It includes before/after frames,
manual scrubbing, and optional outlines of the changing tiles.
