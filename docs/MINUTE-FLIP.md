# Minute transition

The rounded broad clock uses a **400 ms** transition on each adjacent minute
change. It renders the old and new time into two binary 200 × 40 frames, compares
their pixels, and selects only the equilateral tiles containing a difference.
The grid is the same eight-pixel-row lattice used in the typography study.

Selected tiles hinge away along a consistent 60-degree edge to uncover the new
frame underneath. Each tile moves for 320 ms; a left-to-right stagger adds at
most 80 ms. There is no secondary settling animation. Unchanged tiles, unchanged
numerals, the colon, and the gaps between figures remain stationary. Facet shading
uses the active RGB222 palette and disappears when the tile finishes.

The horizontal main clock uses this motion. Zone clocks and stacked Draft time
keep their existing rendering. Rounded broad numerals are the default for new
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
- Two packed source masks use 1,000 bytes each. The native animation frame uses
  2,000 bytes at two bits per pixel. Font and hinge geometry are generated once;
  the map bitmap is reused during animation frames.

## Sources and verification

`shared/minute-flip.js` and `watchface/src/c/minute_flip.c` use identical Q8 hinge
geometry and a cosine lookup. `npm run generate:clock` exports the current rounded
pixel masters and geometry to native tables; this preparation step needs the
installed Playwright browser. Ordinary Pebble builds use the generated assets.

`npm test` checks all 1,440 adjacent minute transitions, stationary regions,
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
