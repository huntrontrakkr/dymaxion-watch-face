# Minute transition

The Chamfer and rounded broad clocks use a **400 ms** transition on each
adjacent minute change: the triangles over the changed figures shrink away and
uncover the new time. It replaces the earlier hinge flip. Both clocks share one
implementation (`shared/minute-flip.js`, `watchface/src/c/minute_flip.c`) with
a small per-face descriptor. It renders the old and new time into two binary 200 × 40 frames, compares
their pixels, and selects only the equilateral tiles containing a difference.
The lattice is a single row of triangles as tall as the figures (36 pixels for
Chamfer, 32 for broad), close to the scale of the map's own faces: 34 and 37
tiles across the strip.

Each selected tile keeps the old drawing in the face's own ink and ground and
shrinks toward its centroid, taking its contents with it, until it vanishes into
the new frame underneath. The scale eases in along a cosine. Each tile moves for
320 ms; a left-to-right stagger adds at
most 80 ms. There is no secondary settling animation. Tiles without a changed
pixel stay still; a changed tile can cover part of a neighbouring figure or the
colon, which shrink with it and reappear unchanged behind. No shading is
added: the motion alone separates old from new.

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
  for the active face only: 4,074 bytes for broad, 4,068 for Chamfer. Broad's
  masters and lattice are static tables; Chamfer's are a 2,350-byte raw
  resource loaded only while it is shown, and the watch finds a pixel's tile by
  binary search over per-row runs instead of a lookup table. This keeps the app
  image inside Pebble's 64 KB process limit. The map bitmap is reused during
  animation frames.

## Sources and verification

`shared/minute-flip.js` and `watchface/src/c/minute_flip.c` use identical Q8 tile
centroids, integer inverse scaling and a cosine lookup. `npm run generate:clock` exports the current rounded
pixel masters and geometry to native tables; this preparation step needs the
installed Playwright browser. Ordinary Pebble builds use the generated assets.

`npm run generate:chamfer` cuts the zone masters and packs its
resource. `npm test` checks all 1,440 adjacent minute transitions for both clocks, untouched tiles,
shrinking areas, endpoints, the 400 ms schedule, and native/browser frame equality for ordinary
minutes, hour carries, midnight, and 12-hour rollovers.
`tests/minute-flip-browser.mjs` exercises the live minute trigger, reduced motion,
disabled motion, idle behavior, time scrubbing, and the responsive replay study.
The shrink has not yet been run in the Emery emulator or on hardware.

`output/minute-flip-study/` records the retired hinge flip: its replayable study
(`minute-flip.html`, built with `node output/minute-flip-study/build.mjs`) and
the emulator capture `native-minute-flip.gif`. It bundles its own copy of the
old code and is kept for comparison.
