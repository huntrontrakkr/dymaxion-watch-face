# Energy-efficiency spike

27 September 2026. Baseline: **0.5.1**, `main` at
`0f5119afa0da3b8a28ef797d5c7eb30e0fbb2c53`. Experiment:
`spike/energy-efficiency`. This is a measured prototype for review and device
testing; it keeps the package version at 0.5.1 and does not publish a store update.

The spike reduces the measured minute-animation kernel by **57–60%** and
default daily phone-to-watch messages by **67%**, while preserving the rendered
animation. These are reductions in work, rather than measured whole-watch
energy savings. The CPU-only power model below suggests a modest absolute gain;
hardware testing is needed to measure the total benefit.

## Changes

- **Acknowledged-packet cache.** Routine refreshes omit unchanged data. Launch,
  reconnect, unknown/legacy requests and companion restart get full state.
  Failed acknowledgements invalidate the cache for that packet, with retries
  and replacement by newer queued data. `REQUEST=2` identifies routine sync;
  old companions still safely respond with full state.
- **Change-aware native painting.** Duplicate/invalid packets cause no paint.
  Updated weather, humidity and tide data repaint the tray when relevant to
  its current page. Settings, palette, city and layout changes retain full
  redraws and existing migration handling.
- **Cached animation geometry.** Build a pixel-to-triangle lookup and cache
  centroids when loading a clock style. Compute the scale once per triangle
  per frame. Retain the 400 ms duration, frame cadence and exact pixels.
- **Cached Health reads.** The optional step line reads today's total once per
  minute and the typical total once per day. Availability is checked each
  minute; date/time changes and permission loss/recovery invalidate the
  relevant values. Smart tray avoids the recent-step query when rain or tides
  already determine the selected page.
- **Bounded city-name reuse.** Still check position hourly, but reuse a name
  for an unchanged rounded 100 m lookup for at most 24 hours. Movement causes
  another reverse lookup. Fresh cached city data stays fresh during a routine
  refresh; failures and age still produce stale/expired states.

## Paired native measurements

Both binaries ran in independent Emery emulators using SDK 4.33.1. QEMU was
restarted after installation before collecting app-only Thumb instruction
traces. Explicit animation samples avoid comparing a different number of
frames when the host is busy. No counted block was unresolved or had conflicting
decoded instruction lengths.

| Workload | 0.5.1 instructions | Spike instructions | Reduction |
| --- | ---: | ---: | ---: |
| Minute animation: 14:21 → 14:22 | 6,548,474 | 2,834,461 | **56.7%** |
| Minute animation: 23:59 → 00:00 | 12,858,292 | 5,148,455 | **60.0%** |
| Receive duplicate settings | 191,002 | 3,404 | **98.2%** |
| Receive weather while its page is hidden | 189,902 | 2,162 | **98.9%** |
| Update visible weather | 275,268 | 85,871 | **68.8%** |
| Update visible humidity | 256,926 | 67,567 | **73.7%** |
| Update visible tide | 240,786 | 51,382 | **78.7%** |
| Cached full paint | 188,225 | 188,259 | Effectively unchanged |
| Quiet one-second idle interval | 0 | 0 | No app work in either sample |

Each animation measurement includes one preparation and fourteen samples at
`0, 33, 66, 99, 132, 165, 198, 231, 264, 297, 330, 363, 396, 400` ms. These are
two transitions, not a day-wide average or a worst-case guarantee. The earlier
[0.5.1 audit](ENERGY-AUDIT-0.5.1.md) used an inert packet to request full paints;
this comparison uses a changed city timestamp for **both** binaries, since an
inert packet correctly causes no paint in the spike.

Ten repeated step-bar paints in the same minute made ten calls each to
`health_service_sum_today` and `health_service_sum_averaged` in the baseline,
and zero calls to either in the spike after priming its cache. Unit tests with
available Health data verify the minute/day boundaries and permission recovery.
Firmware Health-query execution is outside the instruction counter, so its
energy saving is not quantified here. Smart-tray decisions still match the
browser across the existing input matrix, including cases where no step query
can change the decision.

## Paired communication measurements

The actual baseline and spike companion bundles ran against the same fixtures,
settings and simulated day. One initial sync warms the cache; the following
24 hourly requests are measured. Messages have successful 5 ms acknowledgements;
fixture HTTP responses take 25 ms. The phone remains at the same location.

| Configuration | Messages/day, before → after | Payload bytes/day, before → after | Phone HTTP requests, before → after |
| --- | ---: | ---: | ---: |
| Hourly weather, automatic city | **144 → 48** | **37,392 → 11,424** | **48 → 25** |
| Hourly weather plus six-hour tides | 148 → 52 | 38,528 → 12,560 | 56 → 33 |
| Two-hour weather, automatic city | 132 → 36 | 32,304 → 6,336 | 36 → 13 |

Default payload falls **69.4%**, with zero byte-identical repeats in the measured
window. There are still 24 shared, low-accuracy position fixes in each case;
fresh weather and tide fetch cadence is preserved. Travel, reconnects, send
failures and different acknowledgement/network timing will change these totals.
These byte counts exclude transport framing. The watch's periodic requests and
the system Bluetooth connection remain; fewer payload bytes do not imply a
69.4% reduction in Bluetooth energy.

The portable benchmark is checked in:

```sh
git show 0f5119a:watchface/src/pkjs/index.js > /tmp/dymaxion-baseline.js
TZ=America/New_York node tools/profile-companion.mjs /tmp/dymaxion-baseline.js
npm run companion
TZ=America/New_York node tools/profile-companion.mjs
```

Both runs use the checked-in provider fixtures rather than calling live
services. The baseline companion ignores the routine request's value and
behaves as before.

## Power estimate and limitations

For continuity with the earlier [power profile](POWER-PROFILE.md), use SiFli's
[SF32LB52 module datasheet](https://downloads.sifli.com/user%20manual/DS5203-SF32LB52-MOD-1%E6%8A%80%E6%9C%AF%E8%A7%84%E6%A0%BC%E4%B9%A6%20V0p2.pdf),
table 5-5, printed page 17: **7.36 mA at 192 MHz, 3.8 V, running CoreMark**.
This is an illustrative module-current proxy. Pebble's
[hardware reference](https://developer.repebble.com/guides/tools-and-resources/hardware-information/)
identifies the Time 2's SiFli/Star-MC1 platform, but neither source establishes
the watch's current during these operations. The 192 MHz value is a modeling
point, not a measured operating frequency of the user's watch.

With a sensitivity assumption of **1–4 cycles per counted instruction**:

```text
CPU mAh saved/day = saved instructions/transition × transitions/day
                   × cycles/instruction ÷ 192,000,000 × 7.36 ÷ 3,600
```

Repeating the measured ordinary minute 1,440 times gives **0.057–0.228 mAh/day
of modeled CPU savings**. Repeating the heavier midnight transition all day
would give 0.118–0.473 mAh/day; that is a heavier hypothetical workload, not a
normal-day forecast. Night saver would reduce the number of animations and
therefore the absolute saving available from this optimization.

The cycle range is an assumption rather than a measured bound. The model
excludes firmware drawing, LCD transfers, Health-database work, flash I/O,
Bluetooth behavior, memory-retention effects and processor scheduling. In
particular, the same number of animation frames still occurs within the same
400 ms window; this experiment does not claim shorter windows or fewer LCD
updates. Native selective painting may help firmware/display costs, but app
instruction counts cannot establish that electrical benefit.

Accordingly, **57% less animation-kernel work is not 57% less watchface power**.
The extra days per charge cannot be estimated reliably from the supplied 11.8-day
projection: its attribution mixes watchfaces, charging and shared system costs.
The evidence supports keeping these optimizations for hardware evaluation,
with expectations of incremental endurance gains rather than a large runtime
multiplier.

## Memory and validation

The default clock adds **8,340 bytes of heap state**: 8,000 bytes of triangle
ownership plus centroid/scale caches. Broad adds 8,372 bytes including alignment.
That work is paid at style initialization and reused through subsequent minutes.
Code/static RAM rises from 58,581 to **59,129 bytes** (+548); resources remain
99,267 bytes. All eight styles loaded their transition and lookup table in the
emulator. With weather and map labels active, the smallest measured remaining
heap at the recorded allocation peak was **22,316 bytes**. This is measured
headroom for those cases, not a universal bound over every future configuration.

Validation completed:

- **111 core tests** and all **nine browser/phone-settings suites** passed.
- Native SDK build and browser production build passed.
- **23,152 transitions / 252,384 packed frame comparisons** against saved 0.5.1
  native sources matched exactly, across all eight numeral styles and 12/24-hour
  formats. AddressSanitizer, UndefinedBehaviorSanitizer and leak detection were
  enabled. Cases include blank leading figures, every adjacent minute, no-op
  times, carries and time jumps.
- **18 native motion cases** matched a forced full redraw: every numeral style,
  both clock glides, overlapping tray/minute motion, Quick View and a low clock
  overlapping the tray. Four additional native data-update cases matched full
  paints for hidden weather, visible weather, humidity and tide.
- Queue tests cover duplicate/coalesced messages, stale in-flight acknowledgements
  during full resync, uncertain delivery, retries/exhaustion and newer pending
  values. The shipped bridge is tested with named and numeric request keys,
  old/unknown requests and configuration changes.
- Location tests cover cache expiry, position changes, companion restart,
  failed lookups, offline expiry and late automatic results after manual mode.

[Machine-readable results](energy-spike-results.json) record hashes, paired
counts, memory and validation. Local raw traces, GDB scripts, the sanitizer
comparison and emulator captures are retained under
`test-results/energy-spike-before/` and `test-results/energy-spike-after/`.
The test PBW is `test-results/energy-spike-after/dymaxion-energy-spike.pbw`.

For device evaluation, alternate baseline and spike over comparable multi-day
discharge intervals, keeping firmware, backlight, Health settings, notification
load and watchface configuration consistent. Exclude charging intervals and
record elapsed time and battery change. An A/B/A comparison helps distinguish
the change from varying use. No real-device energy measurement is claimed here.
