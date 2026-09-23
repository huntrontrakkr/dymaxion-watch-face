# Broad numeral study

An original clock alphabet, September 23, 2026. Rounded broad numerals are now
available on the native face and in the workshop, with a [400 ms minute flip](MINUTE-FLIP.md).
The outline study lives in `shared/broad-numerals.js` and the
self-contained comparison at `output/broad-numeral-study/rounded-type-study.html`.
The earlier `broad-type-study.html` and `refined-type-study.html` proofs remain
available for comparison.

## Direction

- [Dymaxion v.1, Seth Haller](https://haller.design/dymaxion-v1): very heavy,
  extended numerals with broad horizontal strokes. This is the primary reference
  for weight and width.
- [Foundry Gridnik, Wim Crouwel / The Foundry Types](https://www.thefoundrytypes.com/fonts/foundry-gridnik/):
  small curves between flat facets, keeping the corners from feeling brittle.
- [Quantico, Matthew Desmond / MADType](https://fonts.google.com/specimen/Quantico):
  angled cuts and a clear geometric construction.
- [Forza, Jonathan Hoefler / Hoefler&Co.](https://www.typography.com/fonts/forza/overview):
  softer transitions and open internal spaces.

The numeral outlines were drawn for this study. No reference-font outlines or
font binaries are included in the implementation.

## Drawings and spacing

The native strip is 200 × 40 pixels. The lettering spans x=2 through x=197, with
32-pixel capitals. Each numeral is drawn in a 90 × 64 design space and rasterized
at 45 × 32 pixels. Pixel coverage is sampled before thresholding to a binary mask.
The colon has its own lane, separated from the hour and minute pairs by two-pixel
gutters. Each dot is an 8 × 8 pixel block with clipped corners, matching the
eight-pixel horizontal stroke weight. The earlier five-pixel dots were too light.
Exposed square terminals lose only their single outer corner pixel, adding a
small radius at native size. Existing curved bowls retain their drawing. Each
numeral keeps its own rounded terminals, with a minimum two-pixel space between
neighboring figures.

The 1 has a full foot; the 2, 3, 5, and 7 have long flat strokes. The 0 and 8 have
softened, faceted shoulders. Internal openings are drawn explicitly, not assembled
from seven segments. The 9 currently uses the 6 rotated 180 degrees; optical
adjustments can be made independently after the overall direction is settled.

The main horizontal strokes now share an eight-pixel height: top, middle and
baseline. In particular, the 6 and 7 have the same top stroke. Counters in the
3, 5, 6 and 8 retain four pixels of clear vertical space.

The current direction uses individual numerals throughout. The contextual
ligatures and joining control have been removed. Baseline and cap strokes retain
their full weight, and all pairs retain clear spacing.

## Triangle experiments

One continuous equilateral lattice overlays the entire strip, including its
white space. It does not restart at each numeral. Row spacing is 6, 8 or 10
native pixels, with triangle edge length derived from that spacing. The default
eight-pixel rows align with the cap, middle and baseline stroke boundaries.
The horizontal origin is adjustable independently of those vertical levels.

Three proofs show the rounded numerals, the construction overlay, and the clean
outline after trimming. Selected cuts follow actual diagonal edges of the
lattice. A cut is accepted only if it stays within the chosen depth (zero to
three pixels) of an exterior corner. Cuts never add ink, enter internal counters,
affect the colon, or close the gaps between numerals. Corners without a nearby suitable
line retain their original drawing. This is an outline construction experiment;
neither an etched texture nor filled triangle cells are applied to the lettering.

The construction grid and highlighted cut lines belong only to the study.
Watch preview colors remain on the RGB222 palette. The displayed map and status
come from the existing watch renderer at a fixed time; they stay fixed while
changing the numeral proof.

## Reproduce

`node output/broad-numeral-study/build.mjs` bundles the same renderer into the
inline comparison, including both captured watch backgrounds. The study contains
no network requests or external fonts.

`output/broad-numeral-study/check-study.mjs` checks the controls, narrow layouts,
equilateral grid geometry, stroke/colon dimensions, numeral spacing, and the
bounds of all 1,440 clock readouts. It uses the
existing Vite server for the module checks. Results are saved beside the study.
