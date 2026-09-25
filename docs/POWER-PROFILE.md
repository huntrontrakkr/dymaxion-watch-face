# Native power and performance profile

Measured 24 September 2026 against `main` at `bc47a25`, using Pebble SDK
4.33.1 and its Emery QEMU 10.1.5-pebble14. The animation optimization in this
change was measured against the same build configuration and assets.

The face does not appear to need a performance redesign. Its most expensive
recurring app work is the minute animation, and that can be reduced without
changing the drawing. The existing minute ticks, cached map, short animations
and power controls are sensible. This is an emulator work profile and an
electrical model, **not a measured battery-life result**.

## Measured work

The default Chamfer clock was sampled at exactly
`0, 33, 66, 99, 132, 165, 198, 231, 264, 297, 330, 363, 396, 400` ms.
Each benchmark includes one transition preparation and fourteen frame samples.
These are fixed workloads; a slow emulator can coalesce actual timer frames,
so counting a wall-clock animation would not give a fair before/after comparison.

| Workload | Before: app instructions | After: app instructions | Reduction |
| --- | ---: | ---: | ---: |
| 14:21 → 14:22 | 11,705,240 | 6,548,474 | 44.1% |
| 23:59 → 00:00 | 15,264,828 | 12,858,292 | 15.8% |

These numbers cover the transition kernel, not the complete graphics stack.
They are two examples, not an average over every minute or a proven worst case.
Other numeral styles can change different areas, particularly when their
proportional spacing shifts the whole readout.

Additional measurements on the optimized app:

| Workload | App instructions | Interpretation |
| --- | ---: | --- |
| Quiet two-second interval between ticks | 0 | No app callbacks or busy loop in this sample |
| One cached full paint | 169,148 | Includes the AppMessage used to request it |
| One full paint with map relighting | 828,574 | About 659,000 additional app instructions for relighting |

Flash reads and firmware drawing are outside this counter. Relighting is much
less frequent than the animation and smaller in measured app work, so it is a
secondary optimization target.

## What changed

`minute_flip.c` now finds the bounds of all changing **tiles**, including their
blank pixels, once when preparing a transition. Subsequent samples only inspect
pixels within those bounds. Bounding just the changed ink would be incorrect:
the shrinking old drawing also passes through blank portions of its tile.

The new frame is initialized four pixels at a time from the packed binary mask
using a small lookup table. The no-animation path prepares the new time directly
instead of planning a transition that will never play.

The 400 ms duration, timer cadence, tile geometry and resulting frames are
unchanged. The clock strip is still painted each animation frame; this change
reduces CPU work and does not claim fewer physical LCD transfers.
It adds four bytes of transition state, no heap allocation, and 124 bytes to
the SDK's combined code/static-RAM figure: 61,027 → 61,151 bytes. Resources remain
100,924 bytes.

## Battery estimate and its limits

Pebble's [hardware reference](https://developer.repebble.com/guides/tools-and-resources/hardware-information/)
identifies the current Time 2 as the SiFli SF32LB52J / Star-MC1 platform.
For an indicative active-current proxy, SiFli's
[SF32LB52-MOD-1 datasheet](https://downloads.sifli.com/user%20manual/DS5203-SF32LB52-MOD-1%E6%8A%80%E6%9C%AF%E8%A7%84%E6%A0%BC%E4%B9%A6%20V0p2.pdf),
table 5-5, printed page 17 (PDF page 21), reports **7.36 mA at 192 MHz and 3.8 V**
running CoreMark. This is a module measurement, not this watch's measured current
or verified operating frequency.

Assume 1–4 CPU cycles per counted instruction, 192 MHz, that 7.36 mA proxy,
and 1,440 animations per day. The cycle range is a sensitivity assumption, not
a measured timing range or a guaranteed bound.

```text
CPU mAh/day = instructions/transition × transitions/day × cycles/instruction
              ÷ CPU frequency (Hz) × active current (mA) ÷ 3600
```

| Scenario, using the optimized kernel | Modeled CPU mAh/day | On an illustrative 200 mAh battery |
| --- | ---: | ---: |
| Repeat the ordinary minute workload all day | 0.10–0.40 | 0.05–0.20 percentage points/day |
| Repeat the midnight workload every minute | 0.20–0.79 | 0.10–0.39 percentage points/day |

Repeating midnight all day is a heavier example, not normal operation or a
worst-case guarantee. The 200 mAh capacity is only an example, not a claim about
the production battery. The modeled ordinary-kernel saving is 0.08–0.32 mAh/day
relative to the previous implementation under the same assumptions.

As a separate conservative scheduling scenario, keeping the processor fully
awake throughout all 400 ms animation windows would total 576 seconds/day.
At the same current proxy that is **1.18 mAh/day**, or 0.59 percentage points
on the example battery. This replaces the kernel estimate; do not add them
together. Actual firmware may sleep between frames. This is also not an upper
bound on the whole face, which does other work outside animation windows.

The model excludes firmware graphics and scheduling, LCD transfers, flash I/O,
Bluetooth connection behavior, sensor and Health-service costs, backlight,
vibration, and the platform's baseline consumption. QEMU does not model those
electrically or provide cycle-accurate performance for this chip. Its host CPU
time, frame rate and simulated battery percentage cannot predict days per charge.
No whole-watch runtime claim follows from the percentages above.

## Existing behavior and useful settings

The code follows the main priorities in Pebble's
[battery guidance](https://developer.repebble.com/guides/best-practices/conserving-battery-life/):
allow sleep between events, avoid second ticks, keep motion brief, and batch
phone communication.

| Activity | Current behavior |
| --- | --- |
| Clock | Minute subscription: 1,440 scheduled ticks/day; no second tick |
| Minute animation | 400 ms, approximately 33 ms between callbacks, then timer stops |
| Map shading | Cached 200 × 104 bitmap; normally recomputed every five minutes, 288 times/day |
| Animation paints | Clock strip only after the initial full minute paint; cached map reused |
| Panel switching | Wrist-flick events; no app-level continuous accelerometer sampling or touch polling |
| Phone data | Hourly by default, plus launch/reconnection/configuration; cached forecasts and zone data |
| Health drawer | Reads OS-maintained data; caches history, refreshes the current hour while visible; no active HRM sampling request |
| Backlight | Controlled by the system; the app does not force it on |

Useful choices, in order of likely effect on recurring app work:

1. **Keep the animation, enable night saver from 22:00 to 07:00.** That removes
   540 animations/day, or 37.5%, while preserving daytime motion. Night shading
   slows to every two hours. These are event-count savings, not a 37.5% whole-watch
   battery saving.
2. **Disable minute animation if maximizing endurance matters most.** The clock
   still updates once a minute. This removes the repeated-frame work but does
   not remove the normal minute wake and paint.
3. **Use 15-minute daylight updates if the slower terminator is acceptable.**
   Relighting falls from 288 to 96 times/day. Combined with the above night hours,
   it runs 65 times/day. This is a smaller opportunity than animation CPU work.
4. **Leave phone refresh hourly unless fresher weather is needed.** Auto city
   lookup limits the watch's request interval to one hour even when weather is
   configured less often. Existing low-battery motion suppression already stops
   animation at or below 10% by default; the threshold is configurable.

Night saver can also pause redraws until a wrist flick, but the minute callback
still runs. Do not describe that setting as eliminating all wakes. Shake detection
can still have a system sensor cost even though the app does not poll samples.
The companion resends some unchanged packets during sync; reducing those is a
possible later improvement, but its current hourly cadence does not justify
complicating cache/reconnection behavior without a measured radio problem.

No defaults were changed for this profile. There is no evidence here that the
map, fonts, charts or animation need to be removed for performance.

## Method and validation

- Build both versions with the same SDK, resources and production compiler
  options. Keep their PBW and ELF files. Install each build and restart QEMU
  before recording; do not reuse translated blocks from a different app binary.
- Read the relocated app base from the firmware's `g_app_load_address`, rebase
  the ELF symbols, and restrict QEMU logging to the app address range. This run
  used `0x20050400` and a `0x20000` range; discover the base again for other SDKs.
- Start QEMU with `-d in_asm,nochain` to record translated blocks from boot.
  During each benchmark enable `log in_asm,exec,nochain` through its monitor.
  `nochain` is necessary to see every executed block. This SDK emits Thumb bytes
  in `OBJD-T` records; decode their 16/32-bit instruction lengths and multiply
  by each block's execution count. No block was unmapped or had conflicting
  instruction lengths in the reported measurements.
- With GDB and the relocated symbols, invoke `clock_flip_prepare` once on the
  loaded face and `clock_flip_sample` at the fourteen explicit timestamps above.
  Use the same digit pairs and existing buffers for both versions. Restore
  scratch state and restart the app afterwards. These function calls measure
  the ARM binary independently of host scheduling; they do not measure a complete
  display refresh.
- Disable tracing for visual checks. Use QEMU monitor `screendump` to capture
  frames without sending screenshot requests to the watch. Normalize the
  emulator's backlight scaling before comparing RGB222 pixels. Reset the app
  after moving the emulated clock backwards, so old timer timestamps cannot
  contaminate the next case.

**Validation:** all 68 core tests passed, including native C/browser frame
parity for all eight numeral styles, blank leading figures, unchanged times,
hour carries and midnight. The native SDK build passed. All 23 new emulator
cases settled to a frame pixel-identical to a forced full redraw: eight styles,
both clock glides and their overlap with minute motion, Quick View, a clock
overlapping the tray, midnight, animation disabled, night saver, low battery,
and restored animation. The disabled/night/low-battery clock captures contained
only their old and new readings, with no intermediate animation frames.

The pre-push regression pass also compared the optimized native renderer with
the implementation at `bc47a25`, using AddressSanitizer, UndefinedBehaviorSanitizer
and leak detection. Across all eight styles and both 12- and 24-hour formats,
every adjacent minute was sampled at nine stages; selected carries, no-op
updates and time jumps were additionally sampled at every millisecond from
0 through 401. All **23,152 transitions / 252,384 frame comparisons** matched
exactly, with no sanitizer errors. All four standard browser suites and the
additional minute-transition browser checks passed, as did the web production
build and a clean native SDK build.

[Machine-readable results](power-profile-results.json) include binary hashes,
instruction counts and the native-case results. Local raw traces, GDB commands,
scripts and captures are retained under the ignored `test-results/power-profile/`.
Large traces are gzip-compressed; decompress them before rerunning the local
trace analyzer.
The next useful battery measurement is a matched hardware comparison over
several days: same firmware, notification load, backlight and Health settings,
with only minute animation on/off changed. A current probe would additionally
separate each animation, map refresh and radio burst.

## Tray completion regression, version 0.3.5

A subsequent native Emery run reproduced an intermittent incomplete tray swipe:
one of 28 panel changes stopped with 2,399 tray pixels different from a fresh
paint. The last frame sampled the animation before its 300 ms endpoint, but
finished drawing after it. The scheduler then stopped without painting the
endpoint, leaving the chart shifted until another redraw.

The scheduler now keeps the tray timer alive until the drawing code finishes
the transition. It still stops at rest and shares the minute-animation timer.
No drawing, layout, map or animation duration changed.

The corrected package passed 33 native emulator cases: two complete panel
cycles in each of three configurations (28 transitions), three overlapping
minute/tray animations, and Quick View interruption and dismissal. Every
settled frame matched a forced full redraw pixel-for-pixel. All 70 core tests
and the native and web builds passed. See the
[tray verification results](tray-verification-results.json) for case details
and the tested package hash. These checks do not replace physical-device testing.
