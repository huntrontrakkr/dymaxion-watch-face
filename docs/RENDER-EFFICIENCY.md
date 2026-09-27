# Clock drawing efficiency

27 September 2026. Baseline: **0.5.2**, `main` at
`8ae32a4f67caa9c69c7183f745bed3254dfb2abd`. Experiment:
`spike/render-efficiency`. The measurement builds kept version 0.5.2; this
optimization is included in [0.5.3](../releases/v0.5.3.md). The results below
describe the paired builds before the release version bump.

The second sweep found a substantial avoidable cost in drawing the clock.
Even when its pixels were already cached, the renderer scanned the strip into
hundreds of horizontal line calls. Pebble's firmware then clipped and marked
dirty regions repeatedly while writing those lines.

The experiment gives the existing two-bit frame buffer to a palettized
`GBitmap` and draws the strip once. The bitmap owns the same pixel allocation;
there is no additional image-sized buffer or per-frame allocation. Newly
sampled frames have their four two-bit pixel groups reordered in place for
Pebble's high-bit-first bitmap format. Cached frames are already in that order.
The four palette entries are refreshed on each draw.

The animation geometry, 400 ms duration, frame cadence, clipping through the
graphics context and final pixels are preserved. If the bitmap cannot be
allocated, or its stride differs from the packed strip, the existing line
renderer remains available. Its buffer stays in the original pixel order.

## Paired measurements

Both builds ran in independent Emery emulators under SDK **4.33.1**, restarted
after installation. These traces include **application and firmware** execution,
unlike the application-only animation-kernel measurements in the earlier
[energy spike](ENERGY-SPIKE.md).

| Default clock workload | 0.5.2 instructions | Experiment instructions | Reduction |
| --- | ---: | ---: | ---: |
| Draw a cached final frame | 2,898,210 | 264,211 | **90.9%** |
| Regenerate the final frame and draw it | 2,916,059 | 323,396 | **88.9%** |

Each scope starts at `draw_time` during a normal update callback and ends when
that function returns. Both builds show 14:21 with the default 200 × 40 clock.
A changed city timestamp requests the paint. The debugger fixes the animation
as completed; the second case additionally invalidates `s_clock_frame` before
entering the scope. Setup, communications before the callback, map drawing,
panel drawing and display transfer after the callback are outside the scope.
Firmware interrupts that occur inside it are included.

The baseline makes **394 line-drawing calls** for this frame. The experiment
uses one bitmap draw. Its largest firmware cost is now the palette-to-eight-bit
bitmap blitter. Baseline hotspots include rectangle containment, union and
clipping, setting pixels, and marking framebuffer regions dirty.

Counts come from decoded Thumb instructions in QEMU's `in_asm,exec,nochain`
trace. The counter associates execution with the host translation-block
identity and translation flags, since debugger stepping and recompilation can
produce different block lengths at the same guest address. Every executed
block in these four measured scopes resolved to one decoded length; there
were no unresolved or ambiguous executions. Full-screen captures for both
measured cases matched exactly between builds.

These are **two clock-drawing samples**, not complete-animation, whole-minute
or daily averages. QEMU instruction counts are not cycle-accurate or electrical
measurements. In particular, 91% less work in this scope does not establish
91% less watchface power or a specific increase in days per charge. The
number of wakeups and animation frames remains unchanged.

## Validation and memory

The native SDK build and **112 core tests** passed. An exhaustive sanitizer
test verifies all 256 possible groups of four two-bit pixels, retaining every
pixel's palette index when decoded in Pebble's bitmap order.

**18 native motion cases** matched a forced full redraw, covering all eight
clock styles, left/right clock glides, simultaneous tray and minute animations,
Quick View and a low clock overlapping the tray. This exercises the SDK bitmap
path under ordinary callback scheduling and translated/clipped contexts.

**59 paired full-screen captures** matched 0.5.2 with zero differing pixels:
all eight styles sampled at 0, 80, 160, 240, 320, 399 and 400 ms for 14:20 →
14:21, plus three custom ink/background combinations. For these comparisons,
both emulators have the same fixed time and prepared transition; the candidate
buffer is packed into SDK order before the normal callback draws it. The
ordinary native motion cases above separately exercise the production sampling
and conversion path together.

The native allocation fallback was also checked by forcing the bitmap
constructor to return `NULL` during a normal settings callback. The old line
renderer produced the same screen; a subsequent reconfiguration successfully
allocated and used the bitmap again.

Code/static RAM rises from 59,129 to **59,489 bytes** (+360). Resources remain
99,267 bytes. Every style's steady and peak heap use rises by **36 bytes**, for
the bitmap metadata and allocator bookkeeping. All styles loaded the bitmap
and animation lookup successfully. With weather and map labels active, the
smallest measured remaining heap at the allocation peak was **21,920 bytes**,
compared with 22,316 in 0.5.2. These are the measured configurations' headroom,
not a bound over every possible configuration. Runtime allocation measurements
and paired intermediate-frame captures are recorded with the
[machine-readable results](render-efficiency-results.json).

## Other areas reviewed

The watch already uses minute ticks, bounded animation timers, cached map
relighting and cached Health reads. There is no continuous accelerometer
sampling, touch polling, forced backlight, or watchface-triggered heart-rate
measurement to remove. The companion's acknowledged-packet cache, shared
coarse location fix and bounded city-name reuse remain useful.

A minute tick could potentially reuse more of the already shaded map. Custom
positions, on-map times, the nameplate, marker pulses and Quick View make
invalidation less straightforward. The current experiment retains those full
minute paints; their extra complexity is not needed to obtain the measured
clock-drawing improvement. Combining phone packets further would also need
separate latency/reconnect measurements rather than an assumed radio saving.

Local raw traces, scripts, saved PBWs/ELFs and captures are retained in
`test-results/render-spike-before/` and `test-results/render-spike-after/`.
The paired results record their binary hashes. No real-device energy
measurement is claimed.
