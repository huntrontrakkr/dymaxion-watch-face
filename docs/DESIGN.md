# A wrist Geoscope

This face treats places and their relationships as the useful content. The map
is the organizing idea; the time displays and markers are movable instruments
around it. This is a contemporary interpretation of Fuller, not a reproduction
of a historical artifact or an endorsed Buckminster Fuller Institute product.

## What carries forward from the original concept

`shared/map.js` preserves the original supplied designer's twelve normalized
vertices, twenty face definitions, all twenty-two `GPLACE` placements, and the
LCD partitioning of split triangles 9 and 16. Its forward and inverse mappings
use the same gnomonic barycentric method. Meridian and Horizon place the same net
above or below a readable clock and three zone displays.

The coastlines are regenerated from Natural Earth 1:110m land data at the same
0.5-degree sample centers. They are not a byte-for-byte copy of the pasted base64
mask. The canonical geometry is unchanged. This implementation does **not**
claim to be the exact Gray–Fuller within-triangle transform; the supplied
concept's stated 0.022-edge validation bound has not been independently verified.
The tests instead check thousands of forward/inverse pairs, split-face coverage,
chirality, and agreement between map pixels and markers.

The alternative derived tree/strip nets, compulsory hexagonal clock vessels,
and forced triangular snapping are omitted. Pixel positioning and two
starting compositions make space for experimentation without changing the map.

## Fuller as a design constraint

- **One connected planet:** preserve the canonical continental relationships;
  omit political borders; make place markers meaningful and geographically true.
- **The world as an information display:** light and shadow are computed from
  the sun's direction. A daylight indicator beside each remote clock ties civil
  time to the physical planet. A +1/−1 label makes date differences explicit.
- **More from less:** bake geometry once; allocate one small map bitmap; redraw
  on minute ticks; use short, bounded motion on launch and configuration changes.
  No continuous background animation or second-tick service on the watch.
- **Useful freedom:** vertical clock placement, independent place positions, explicit coordinates,
  any named IANA zone, five small map glyphs, independent RGB222 marker colors, two
  starting layouts, and fourteen [palettes](PALETTES.md).

These are design interpretations based on BFI's accounts of the
[Dymaxion map](https://www.bfi.org/about-fuller/big-ideas/dymaxion-map/),
[Geoscope](https://www.bfi.org/about-fuller/big-ideas/geoscope/), and
[design science](https://www.bfi.org/about-fuller/big-ideas/design-science/design-science-primer/).
Shoji Sadao's contribution to the map is acknowledged alongside Fuller.

## Map symbols

Twelve abstract 5×5-pixel glyphs distinguish the three tracked places: diamond,
point, ring, triangle and plus, and the notation marks dagger, double dagger,
asterisk, pilcrow, check, cross and number sign. The former 9×9 pictograms competed with the
map and made literal claims that the small display could not support. These
marks are cartographic cues rather than miniature illustrations. The
[map-glyph notes](MARKERS.md) show the set enlarged without interpolation.

Each place has an independent color. A color can follow its theme's default or
hold a custom choice, rounded to the nearest RGB222 shade so the browser and
Pebble draw the same pixels. The chosen color runs through the map symbol,
zone label, daylight dot and one brief pulse on launch and on returning to the time-zone panel. The black or paper-colored
halo keeps the 5×5-pixel mark separate from the map beneath it.

## Typography

The workshop's masthead is an **original pixel nameplate script**, drawn
specifically as a wordmark. It used to head the watch face too; the face now
opens with the status line instead. Its low, extended lowercase and long horizontal joins draw on the
appliance nameplates of the 1950s. A wide swept D, shallow angular shoulders
and a compact y descender give it a deliberately streamlined rhythm.
It uses a 124×17 master with solid one-pixel strokes: no antialiasing,
font conversion, scaled outlines or compression artifacts.

The wordmark was drawn from scratch in `tools/generate-wordmark.py`; it does not
use glyphs from DymaxionScript or another font. It takes the broad idea of a
mid-century script nameplate as its brief. The sphere has been removed, leaving more
space for the name. The SVG website artwork and the type study's pixels are
generated from exactly the same original drawing.

The default clock is **Chamfer**: the Draft zone numerals enlarged three times,
to a 36-pixel cap height, with every exposed pixel corner cut on a 45° line and
every inside step filled on the same diagonal. The big clock and the zone clocks
are one drawing at two sizes. It is deliberately smaller than the map. Figures
sit in 27-pixel tabular cells so the readout never shifts and the minute transition
moves only what changes. A status line of Draft Micro lining capitals carries
the date and city at the top of every composition. In 12-hour time the Chamfer
clock carries AM/PM itself, in small accent capitals top-aligned with the
figures, so the status line keeps its width for the city. The leading zero
(09:07) is on by default and can be turned off, which leaves the first slot
blank so the other figures keep their places; stacked time keeps
AM/PM in its caption, and the wider numeral styles leave it in the status line. The reasoning, and a comparison with the previous default,
are in [Meridian](MERIDIAN.md).

The **Dymaxion Span** option is an original 28-pixel-high cut drawn for
this 200-pixel screen. Four 45-pixel digit advances and a 10-pixel colon total
190 pixels on every minute. Wide horizontal strokes, clipped hexagonal turns
and open counters draw substantial inspiration from [Seth Haller's Dymaxion v.1](https://haller.design/dymaxion-v1),
whose variable-width extremes and hexagonal construction shaped the brief.
The watch contours are independently drawn with a steady three-pixel stroke.
Native C draws the authored pixel runs directly; this avoids the hidden side
bearings and wrapping that Pebble's text layout adds at this width. The browser
uses those same runs.

The **triangular seven-segment experiment** (a hexagonal display of 330
equilateral cells, informed by Synergetics §420) is retired. Saved faces that
used it open with Chamfer figures, and removing its 1,350 native pixel runs
freed 5.8 KB of the watch's static memory.

**Dymaxion Draft** remains the information type. Its earlier display cut is
available for optional stacked hours/minutes. The 12-pixel zone numerals are
drawn separately with two-pixel stems. **Micro**
has seven-pixel capitals, a five-pixel x-height, open counters and natural letter
widths. Dates use a separately drawn oldstyle numeral set. Micro is not a reduced
copy of the display font.

The [interactive type study](../designer/type-study.html) places Span and Draft beside
**Alegreya Sans** for calligraphic warmth, **Fira Sans** for instrument clarity,
and **Recursive Sans** for restrained signpainting character. The lessons are
proportion, open shapes and rhythm; no reference outlines are used in Draft.
Recursive uses a 0.35 Casual instance and has no oldstyle figures, which the
study makes explicit. Oldstyle figures offer varied text rhythm, not an assumed
universal legibility advantage; the watch uses lining numerals for its clocks.

- [Alegreya Sans / Huerta Tipográfica](https://github.com/huertatipografica/Alegreya-Sans)
- [Fira / Carrois and Edenspiekermann](https://carrois.com/fira/)
- [Recursive / ArrowType](https://www.recursive.design/)

`tools/draft-lettering.py` holds Draft's original curves and pixel masters.
`tools/generate-draft.py` also draws Span and builds grid-aligned TrueType
contours, then checks every glyph and advance pixel-for-pixel through FreeType.
Span's pixel runs are generated for direct native drawing, so its TTF is for
browser proofing and does not add a watch resource. Pebble resource sizes for
Draft are 44, 18 and 12; actual numeral/capital ink
heights are 28, 12 and 7. Both the native clock and browser use
integer placement, without relying on kerning or antialiasing. Reference proofs
are prepared independently by `tools/prepare-watch-type.py` using the SDK's
monochrome FreeType flags. The earlier Synergetic Mono study remains in the
source history but is not used on the watch.

Visual references for the wordmark's proportions include the
[DymaxionScript specimen](https://www.fontsquirrel.com/fonts/dymaxionscript),
[the Philco Automatic badge](https://i.pinimg.com/originals/17/2e/f9/172ef9184a2cf9e76744d8dff0aa2199.jpg),
and [Crosley Shelvador](https://www.ebth.com/items/4447281-1950s-crosley-shelvador-automatic-refrigerator).
These are visual research references, not source outlines or bundled artwork.

## Proportion

Meridian stacks the status line, the 200×40 Chamfer strip (figures from y=24
to 60), the map from y=73 and the zones from 189. Horizon swaps clock and map:
map from y=24, clock from 134.

With broad, Span or segment numerals, the clock occupies the same 200×46 area. Span spans 190
pixels with 28-pixel-tall numerals. The triangular construction occupies a
196×37 envelope. The
map's bounds now follow the *visible pieces* of the split faces, removing unused
space without changing the projection, proportions or coastline geometry.
Landscape scale grows from 31.33 to 35.64 pixels per net edge, about 14 percent.
The 200×104 raster gives the planetary view more of the watch's width.
Meridian and Horizon balance the full-width clock against it. Earlier horizontal
layouts migrate to these proportions; the retired Atlas composition and saved
portrait layouts open as Meridian
while preserving palette, tracked cities, time zones, and display preferences.

## Quick View

When a timeline peek (Quick View) covers the bottom of the screen, the face
redraws as the card slides in and out, using the system's unobstructed area.
The bottom band (zone clocks or the current panel) is not drawn beneath the
card, and a clock the card would cover moves up to sit two pixels above it,
over the lower edge of the map but never into the status line
(`clockTopForVisible`, `clock_top_for_visible`). Meridian's clock is already
clear of it. The workshop's **Quick View** switch previews this with an
approximate 51-pixel card; the watch uses the real card height.

## Bluetooth buzz

When the phone connection drops, the watch gives a double pulse; optionally a
single short pulse when it returns, or no buzz at all (**Buzz on Bluetooth**).
Nothing buzzes during Quiet Time or at launch, and a flapping link buzzes at
most once every two minutes (`connection_buzz`). The Bluetooth mark in the
status line shows the state either way.

## Motion and time

The selected place gets a one-second expanding ring on launch/settings changes.
Its time block gets the same accent. Animation stops afterward and is suppressed
at 20% battery or below. The browser also respects reduced-motion preferences.
An optional wrist flick changes the bottom panel through Pebble's hardware tap
detection, described in [bottom panels](PANELS.md). There is no accelerometer
sampling and no touch handling. This version does not implement a 3D
folding animation.

Named zones replace the concept's fixed numeric offsets. The phone sends the
current UTC offset and the next eight transitions for each zone. The ninth
transition marks the cache as stale with `?`; a connected phone refreshes the
cache on startup, reconnection, settings changes, and periodic requests (six
hours in manual-city mode, or the shorter weather/city refresh interval). Future
government rule changes require an updated bundled IANA database. No city is
inferred from the local UTC offset. The primary clock follows the watch's local
time; markers belong only to explicitly configured places.

The status line replaces “local” with the actual city, following the location-label
idea in ForecasWatch 2. The phone requests a low-accuracy location at most once
an hour, rounds coordinates to three decimals and sends them to
[Photon's reverse endpoint](https://github.com/komoot/photon/blob/master/docs/api-v1.md).
It chooses city/town/village rather than a street or nearby business. Only the
returned name, timestamp and the position rounded to 0.1° (about 11 km) are
cached on the phone; that rounded position also goes to the watch, and nowhere
else, so the panel charts can shade night from the wearer's actual sunrise and
sunset. Network
or permission failures back off for 15 minutes. A failed refresh or a name more
than two hours old is marked `?`; automatic names expire after six hours. An
expired or missing name leaves the date rather than claiming a current city.

Automatic city naming requires phone location permission and a connection for
refreshes. Manual names work offline and do not expire. The Micro font supports
Latin lettering; accents are folded to supported forms. Long captions truncate
the city while preserving the date and AM/PM. The browser initially shows an
explicitly labeled Norfolk example and only requests location on the preview
button. The public Photon server has no availability guarantee; a larger-scale
release should provision a geocoder with appropriate capacity.

Solar shading follows the fractional-year/equation-of-time approximation in
[NOAA's General Solar Position Calculations](https://gml.noaa.gov/grad/solcalc/solareqns.PDF).
It is a visual solar clock, with quantized direction vectors and a dithered
twilight boundary. It does not predict sunrise events or atmospheric refraction.

## Lunar indicator

The larger interchangeable widgets have been removed so the local time can
span the face. A 9×9-pixel Moon glyph sits between the status line and Bluetooth
status in the top bar. It can be disabled in settings.

Eight simple phase drawings show new, crescent, quarter, gibbous and full Moon
in waxing and waning order. The browser and watch share the same pixel masters;
the native generator packs them into 9-bit rows. Approximate Sun and Moon ecliptic
longitudes select the phase each minute. Its selection agrees within one of the
eight steps with the [U.S. Naval Observatory's 2026 primary phase times](https://aa.usno.navy.mil/calculated/moon/phases?date=2026-09-01&nump=8).
The [glyph sheet](screenshots/status-glyphs.svg) shows all eight shapes at 4× scale.
The lit side follows a conventional northern-oriented view; location-specific
sky rotation is outside this tiny indicator's purpose. The adjacent 7×11-pixel
Bluetooth rune stays visible in both states and is dimmed and slashed when the
watch is disconnected.

## Current bounds

Emery only: 200×228, RGB222. Three tracked places plus the local clock. The map
has one baked horizontal size, with free vertical positioning within the
display; arbitrary map scaling/rotation and configurable palette channels are
not implemented. Seventy-four
city-light points are retained from the supplied concept, rendered as individual
pixels. The bottom band adds weather, humidity and NOAA tides through a phone
companion with cached requests, plus a local two-week calendar. Weather coordinates
come from configured places; the separate clock-city lookup uses the phone's
location capability, and its rounded position sets the charts' day and night. There is no health metric integration.

The browser is an interactive layout preview, not a firmware emulator. Its
custom font pixel masters match the SDK FreeType output; surrounding layout
and device services still require native verification. The checked-in emulator screenshots
show the native output. Physical watch readability, power consumption, and the
phone webview still need device testing.
