# Energy audit: 0.5.1

The subsequent [energy-efficiency spike](ENERGY-SPIKE.md) implements and measures
the main opportunities identified here.

Measured 27 September 2026 after pulling `main` at
`0f5119afa0da3b8a28ef797d5c7eb30e0fbb2c53`, using Pebble SDK 4.33.1 and
its Emery emulator. This audit records the current implementation and proposed
improvements; it does not change the watchface or publish a release.

There are worthwhile opportunities to reduce work while preserving the design.
Start with duplicate phone messages and the resulting unnecessary paints, then
optimize triangle lookup in the minute animation. The new optional step line
also needs caching. The existing map and weather-sunlight caches are effective.

## Interpreting the supplied battery chart

The screenshot estimates 11.8 days from full to empty. Its attribution assigns
19.6% of consumption to applications/watchface, 18.7% to Bluetooth and 18.8% to
backlight. These are shares of overall consumption over the displayed period.
That period contains both FCW2 and Dymaxion, plus a charging interval, so it does
not isolate Dymaxion's daily drain. Bluetooth also serves notifications and the
system connection; the entire Bluetooth share cannot be assigned to this face.

The following measurements identify avoidable computation and communication.
They cannot convert those savings into a reliable number of additional days
per charge. Firmware drawing, LCD transfers, radio behavior, sensor services
and electrical power are outside the application-instruction counter.

## 1. Eliminate redundant sync traffic and paints

A simulation ran the actual shipped phone companion bundle for 24 hourly watch
requests after an initial warm-up sync. Provider responses came from fixtures;
each AppMessage succeeded with a 5 ms acknowledgement delay. Network responses
took 25 ms. These are repeatable successful-connection scenarios, not a trace
of the user's phone.

| Configuration | Messages to watch | Byte-identical repeats | Payload bytes | Phone HTTP requests |
| --- | ---: | ---: | ---: | ---: |
| Default hourly weather, automatic city | 144 | 72 | 37,392 | 48 |
| Hourly weather, six-hour tides, automatic city | 148 | 72 | 38,528 | 56 |
| Two-hour weather, automatic city | 132 | 72 | 32,304 | 36 |

The default case repeated **half its messages**. Those repeats carried 24,720
bytes, **66.1% of the payload**. Counts exclude Bluetooth and AppMessage framing.
Queue coalescing, reconnects and real network latency will change actual totals.
All three scenarios requested 24 shared, low-accuracy phone location fixes.

The default's 72 exact repeats break down as follows:

| Packet | Repeated messages/day | Cause |
| --- | ---: | --- |
| Settings, footer, display and palette | 24 | Entire configuration sent on every request |
| Weather | 24 | Cached forecast sent before the replacement forecast |
| Tide | 24 | Empty packet sent even though tides are disabled |

Relevant code:

- [`tools/companion.js`](../tools/companion.js): `sync()` always sends settings;
  `enqueue()` merges pending messages but does not remember acknowledged data.
- [`tools/environment-service.js`](../tools/environment-service.js):
  `refreshKind()` sends unchanged cached or disabled data on each refresh.
- [`watchface/src/c/main.c`](../watchface/src/c/main.c): `received()` avoids
  persistent writes for byte-identical data, but always calls `redraw()` and
  `pulse_on_zones()`. Unrecognized packets also take this path.

Recommended change: remember the last **acknowledged** packet per kind, suppress
unchanged routine updates, and return explicit change flags from native packet
handling. Only repaint the affected region when its visible state changes.
An initial/full sync must remain available after app launch, companion restart,
watch state loss or reconnection. Failed sends must remain retryable. Preserve
the existing migration behavior for older companions and palette settings.

Automatic city lookup adds another avoidable transition:
[`tools/location-service.js`](../tools/location-service.js) marks a usable
one-hour-old city stale while refreshing, then immediately sends it fresh again.
These 48 city packets are **not** exact duplicates because their flags and
timestamps change. Keep usable data fresh during a routine refresh and only
mark it stale when its age or an actual failure warrants it. Reuse the reverse
geocode when the coarse location has not moved; retain a bounded refresh and
movement check for travel. This can reduce phone network work as well.

The watch still requests hourly syncs with two-hour weather because automatic
city updates cap the request interval at one hour (`tick()` in `main.c`). A
longer weather interval alone does not eliminate those hourly watch messages.

## 2. Cache triangle ownership during animation

The native default Chamfer transition was profiled with one preparation and
fourteen samples at `0, 33, 66, 99, 132, 165, 198, 231, 264, 297, 330, 363, 396,
400` ms. Explicit samples avoid host scheduling or dropped emulator frames
changing the workload.

| Transition | Application instructions | Instructions in `chamfer_owner` |
| --- | ---: | ---: |
| 14:21 → 14:22 | 6,548,474 | 3,587,555 (54.8%) |
| 23:59 → 00:00 | 12,858,292 | 7,193,381 (55.9%) |

These kernel counts match the optimized values in the earlier
[power profile](POWER-PROFILE.md). They indicate a remaining optimization
opportunity, rather than an animation regression in 0.5.1. They are two
transitions, not a day-wide average or worst-case bound.

In [`minute_flip.c`](../watchface/src/c/minute_flip.c), `clock_flip_sample()`
repeatedly searches the same row boundaries to find the triangle owning each
destination pixel, then searches again for transformed source pixels. Tile
centroids and animation phases are also evaluated repeatedly within a frame.

Recommended experiment: cache ownership for the loaded clock face and compute
phase/centroid work once per active triangle per frame. Compare a compact
row-run representation with direct lookup before choosing the RAM tradeoff.
The default 200 × 40 face has 34 cells; a one-byte-per-pixel lookup would cost
8,000 bytes. Other numeral styles must be checked separately. The build's
reported 72,491-byte heap allowance precedes map/font/animation allocations,
so it must not be treated as free runtime heap.

Keep the 400 ms timing and exact resulting pixels. Prove the improvement with
all-style native frame comparisons, memory checks and the same ARM trace cases
before adopting it. The 54.8% figure is the current lookup cost, not a predicted
54.8% CPU saving; replacements have their own cost.

## 3. Cache optional step-line queries

`draw_status_section()` in [`main.c`](../watchface/src/c/main.c) reads both today's
step total and the typical whole-day total on every full paint when the step
line is enabled. Cache the typical total until the next day and current steps
for the current minute, with explicit invalidation for permission/time changes.
This avoids repeated Health-service calls during unrelated syncs or paints.
The step line is off by default, so this only helps users who enable it.

The Health drawer already caches its hourly history and typical day. Smart
tray selection also has a smaller opportunity: [`panels_tick()`](../watchface/src/c/panels.c)
queries ten minutes of steps when Health is in the rotation, even when the
rain or tide priority in [`smart_tray.c`](../watchface/src/c/smart_tray.c) will win.
Evaluate those higher priorities first and only query steps if needed.

Health queries execute in firmware, outside this counter. The very small
application-instruction difference with the step line enabled does not measure
their full cost. None of these paths requests continuous heart-rate sampling.

## 4. Keep working caches; refine minute paints later

| Native workload | Application instructions |
| --- | ---: |
| Quiet one-second interval between ticks | 0 |
| Cached full paint | 187,759 |
| Full paint with map relighting | 830,744 |
| Cached full paint with step line enabled | 188,038 |
| Full paint with cached weather chart | 273,002 |
| Weather paint with both solar caches invalidated | 5,317,879 |
| Full paint with cached Health drawer | 225,374 |

Map relighting adds about 643,000 application instructions in this case and
runs every five minutes by default. The weather chart's solar calculations are
more expensive on a cold cache, but cached paints avoid most of that work.
Both solar caches were explicitly invalidated for the cold case; this does not
describe every hourly redraw, because the next-sun-event cache lasts until its
event. There is no evidence here to justify removing accurate solar shading.

The watch subscribes to minute ticks, stops animation timers at rest and reuses
the shaded map. It uses the system wrist-flick event service, has no raw
continuous accelerometer subscription or touch polling, and never forces the
backlight on. This follows the priorities in Pebble's
[battery guidance](https://developer.repebble.com/guides/best-practices/conserving-battery-life/).

The initial minute paint still redraws the full face, while subsequent animation
frames can use the clock/tray regions. Extending selective painting to ordinary
minute updates is a later option. It needs coverage for map time labels,
midnight, overlapping layouts, Quick View and return from the background. A
full application paint does not establish how many physical LCD rows the
firmware transfers.

## Useful settings now

- Night saver, **22:00–07:00**, leaves daytime motion intact and reduces scheduled
  minute animations from 1,440 to 900/day. That is 37.5% fewer animations, not
  37.5% less total battery use.
- **15-minute daylight updates** reduce scheduled map relights from 288 to
  96/day, or 65/day with those night-saver hours. Counts exclude initial and
  settings-triggered relights.
- Turning minute animation off removes repeated animation samples while
  preserving the normal minute clock update.
- Pause in the dark can suppress night paints; minute callbacks still run.
- Backlight accounted for a substantial share in the screenshot. Pebble's
  system **Settings → Display → Backlight → Battery Saver** is a separate
  available control, described in its
  [July update](https://repebble.com/blog/pebble-mega-update-july-2026).

## Reproduction and next validation

The native SDK build passed. PBW SHA-256:
`bb62f1fff238e705eaae78ec882213be5a2bfdc941b82ef5badbd918b3547b6d`.
SDK-reported resources: 99,267 bytes; combined code/static-RAM figure: 58,581
bytes. This audit did not rerun the whole behavioral regression suite because
production source and assets were unchanged.

Install the current PBW and restart QEMU before tracing, so translated blocks
cannot belong to an earlier binary. Resolve `g_app_load_address` (this run:
`0x20050400`), rebase the ELF symbols, and count decoded Thumb instructions
from app-only `in_asm,exec,nochain` block traces. All counted blocks resolved;
there were no conflicting decoded block lengths. Full-paint cases include a
single inert AppMessage used to request one paint. Kernel cases invoke the
existing native functions through GDB at the explicit times above.

[Machine-readable results](energy-audit-0.5.1.json) retain the counts and
scenario details. Local scripts, fixtures and raw traces are under the ignored
`test-results/energy-audit-0.5.1/` directory. The phone script runs with
`TZ=America/New_York node test-results/energy-audit-0.5.1/phone.mjs`; it executes
the committed bundle with mocked transport and provider responses.

For a subsequent optimization release, test send failures/retries, reconnects,
watch/phone restarts, settings migrations, disabled/re-enabled pages, stale data,
movement and offline recovery. Animation changes additionally need pixel parity
across numeral styles and memory checks. Measure the changed builds with the
same workload. Then compare multi-day hardware discharge under similar
backlight, notification, firmware and Health settings, using stable discharge
intervals instead of a chart spanning charging and multiple watchfaces.
