# Bottom panels

The bottom 44 pixels (rows 184–227) show one page at a time. The map, large clock,
Moon and Bluetooth indicator keep their existing positions. The **Panels** tab
in the workshop and the offline phone settings expose the same controls.

By default, the three place times also appear on the map whenever another
bottom page is selected or Quick View covers the bottom clocks. They disappear
from the map when those clocks return. The main clock stays centered. Change
**Place times** and **Place times position** in **Character** to choose another
arrangement; previously saved choices are preserved.

The reference was [ForecasWatch 2](https://github.com/mattrossman/forecaswatch2),
including its native Emery screenshot, calendar renderer and configuration.
Its colored temperature/rain chart, night treatment, highlighted today and
weekend colors informed this smaller implementation. We use two calendar rows,
one primary chart line, short rain bars and time labels spaced to fit the width.
No ForecasWatch code, fonts or assets are copied.

## Chart spacing and lettering

The second pass reviewed the actual ForecasWatch 2 renderer at
[`2ee7ad2`, `forecast_layer.c`](https://github.com/mattrossman/forecaswatch2/blob/2ee7ad2992b58986efbd1eca995c588005d6ae5c/src/c/layers/forecast_layer.c).
Its side-label strip grows from measured text width; hour-label frequency comes
from available chart width, and Emery gets distinct major/minor ticks. Those
layout principles are adapted here to our much shorter 44-pixel panel.

Hour labels use an original four-pixel-wide, seven-pixel-high numeral cut
with A/P marks. The range labels up the left edge use a narrow companion cut,
the same seven pixels tall but three wide (the 1 two), with a two-pixel minus
and a one-pixel decimal point, so the scale costs little of the chart's width.
Both are drawn in the ink color rather than the series color. Headings and calendar
dates use Draft Micro's lining capitals, the same cut as the status line, so
every panel figure sits on the baseline. All text is whole pixels, with no
font scaling or antialiasing.

Rain probability or amount is drawn behind the temperature line, one RGB222
step toward the ground, so the temperature line leads; the header names the
peak. Humidity joins the same chart as a dotted line in the humidity color on
its own fixed 0–100% scale (it has no range labels; the header reads it out),
so temperature, humidity, rain and daylight share one timeline. It can be turned
off in the weather settings. Tides stay on their own panel. Night carries a dotted field and a grey daylight strip, shaded per pixel
column from the sun's altitude at the forecast position. Weather defaults to
the phone's current location; a saved city can be selected instead. With a
position available, the edges use sunrise and sunset altitude (-0.833°).
Without a current-city position, the watch uses the forecast's hourly daylight
flags. Current-location RISE/SET times use the main clock; saved-city times use
the forecast's own time zone. Provider sunrise/sunset times also serve as the
fallback when the city position is unavailable.

The left gutter measures both range labels, allowing one pixel of outer padding
and two before the plot. A normal two-digit temperature scale needs 10 pixels
(14 with the wider figures, 29 in the first design); a three-digit heart-rate
scale needs 12. Negative values and tide decimals reserve their
actual width; hiding range labels reduces the inset to two pixels.

With a two-digit range, the plot is 184 × 22 pixels rather than 167 × 20, about
21% more plotting area inside the same footer. A quiet baseline has hourly
minor ticks and longer ticks beneath labeled hours. Normal 12/24/48-hour views
with a 24-hour clock label every 2/3/6 hours: seven/nine/nine labels instead of
three. AM/PM labels reserve more width. Narrower or partial data windows choose
spacing from the available width and the measured numeral cut. Label boxes stay
inside the display and retain at least two pixels between neighboring labels.
Each label uses the local hour supplied with its sample, including DST repeats
and jumps. No additional provider samples or refreshes are needed.

`shared/chart-axis.js` defines the pixel cut and browser layout; the generator
exports its glyphs and constants to `generated/chart_axis.h`. Native layout and
formatting live in `chart_axis.c`. Tests compare both implementations across
signed temperatures, tide decimals, partial horizons, 12/24-hour clocks and
midnight. The before/after comparison uses clearly labeled sample data.

Watch graphics render into a fixed 200 × 228 buffer. The browser and native
watch share the same stored clock pixels and status masks; circles and marker
pulses use discrete pixel drawings. Preview enlargement uses whole multiples,
with its origin aligned to physical browser pixels. Chart lines and ticks use
opaque one-pixel strokes; the preview does not smooth or requantize them.

Native Emery screenshots, with actual forecast and NOAA response data:

| Weather | Calendar | Humidity | NOAA tide |
| --- | --- | --- | --- |
| ![Weather panel](screenshots/emery-panel-weather.png) | ![Two-week calendar](screenshots/emery-panel-calendar.png) | ![Humidity panel](screenshots/emery-panel-humidity.png) | ![The Battery tide panel](screenshots/emery-panel-tide.png) |

| Page | Display | Configuration |
| --- | --- | --- |
| Time zones | Existing three place clocks | Places and layout controls remain available |
| Weather | One chart: temperature line, dotted humidity line (fixed 0–100%), dimmed precipitation bars, daylight strip/night dots; header gives temperature, humidity and next rise/set | Current location (default) or saved city, °C/°F, 12/24/48 hours, probability/amount/off, mm/in, rain scale, automatic/fixed temperature range, refresh interval |
| Calendar | Weekday labels and fourteen dates, with today highlighted | Sunday (default), Monday or Saturday start; previous/current or current/next week; weekend pattern in one weekend color; optional public holidays for the United States (federal, observed dates), Canada, Mexico, the United Kingdom (England and Wales), Germany, France or Australia; filled/outlined today |
| Humidity | Relative humidity alone (not in the default rotation; the weather chart carries it) | Fixed 0–100% or fitted range; uses the weather location and cache |
| Tide | Predicted water-height curve and next high/low time (optional: not in the default rotation; switch it on in the panel list. NOAA predictions are fetched only while it is included) | NOAA station, station time zone, meters/feet, automatic/fixed scale, zero line |

Chart range labels, faint midline and colors are configurable. Colors follow
the active theme by default; every light-ground palette and the six palettes
beginning with High Visibility include their own chart and calendar colors, at
7:1 contrast or better against the ground. Saturday and Sunday share the
weekend color (the packet still carries a separate Sunday slot for older
exports; it is not drawn). Editing a color retains the entire
current set as custom colors, so a later palette change preserves it. **Use
theme colors** resumes following the palette. Old exports with edited panel
colors remain custom. All colors snap to RGB222.

The page dots along the last row show the selected page. Chart hour
labels and rise/set times follow the forecast location; H/L times follow the
NOAA station. Calendar dates follow the watch's own local date. Temperature and
humidity headings show the current hourly forecast sample, not a live sensor.

Custom layouts should leave the bottom band free when panels are enabled. The
Meridian and Horizon presets already do. Disabling panels restores the place
clocks without reserving that band.

## Health

The Health page charts today from midnight in the weather chart's layout:
steps per hour as bars in the rain color, the hourly average heart rate as a
line in the temperature color, and this weekday's typical steps per hour
(Pebble Health's weekday-or-weekend average) dotted in the ink color across
the whole day, so the rest of a usual day shows ahead. The header gives today's
steps and the latest heart rate; the corner compares steps so far with a
typical day to this minute (`TYPICAL +12%`). The range labels give the heart
rate scale, or the step scale when there are no heart-rate readings. How often
heart rate is recorded is set in the Pebble app, not by the face.

The watch reads Pebble Health directly and sends nothing to the phone. Hourly
totals are cached: while the page shows, each new minute rereads only the
current hour (and the hour just finished); the typical day is read once a day,
and nothing subscribes to health events. Without Health permission the page
asks for it. Geometry is shared by `shared/health.js` and `health.c` and
checked against each other; the workshop shows an example day marked DEMO.

## Changing pages and battery use

Choose any one to five pages, reorder them, and select a starting page. Under
**Panel gesture**, the default is two separate wrist flicks within two seconds.
Let your wrist settle between them. One or three flicks are also available;
saved choices are preserved on upgrade. These are motion events, not screen taps.

The optional **Light the screen, then flick once** mode listens for motion only
while the watchface is visible and its backlight is on. Wake the light normally,
pause briefly, then flick once to change the panel. A 400 ms guard ignores motion
around the moment the light turns on. It stops listening when the light turns
off; it never keeps the light on or polls a sensor. In bright surroundings,
Pebble's ambient-light setting may keep the backlight off, so use the ordinary
flick modes or automatic rotation if you want to change panels in daylight.

Flicks use Pebble's accelerometer tap service, without a continuous sample
stream. Events closer than 250 ms count as one flick (a flick can register on
several axes); each further flick must follow within two seconds. A page change
is followed by a one-second rest (`panel_tap`). Motion listening stops when the
watchface loses focus, flicks or panels are disabled, or only one page is selected.
Partial gestures reset when settings change or the watchface loses focus.

Pebble currently [reserves touchscreen events for watchapps](https://developer.repebble.com/guides/events-and-services/touch/),
so a watchface cannot detect a double tap on the bottom bar. The watch's own
[wake-on-touch setting](https://help.repebble.com/en/articles/15277496-backlight)
can light the screen; a subsequent wrist flick can then change the panel in
the new mode. Dymaxion subscribes to backlight state changes, never touchscreen
events. With the night saver set to pause redraws, the face redraws at night only
while the backlight is on: any backlight wake brings it up to date at once,
including a touch or button that lights it, and it keeps time until the light
goes out. The night can be your chosen hours, the watch's Quiet Time, or both.

Other periodic work is kept small. The map is relit every five minutes by
default, not every minute (the terminator moves about a pixel in that time);
**Daylight updates** stretches that to 10, 15 or 30 minutes, the night saver to
every other hour, and it stops entirely with day and night off. Animation
frames repaint only what moves: the window's background is clear, so the
screen keeps its last frame, and a minute change or the clock's glide repaints
just the clock strip (plus the status line or tray where they overlap it), a
tray swipe just the tray. The minute tick, the marker pulse, Quick View, a
return to the face and any change of data or settings repaint everything. And the weather
chart's sunrise/sunset shading and header time are cached until the chart
window or the next event moves.

For no panel changes by motion, disable flicks and use a fixed page or timed
rotation (1, 2, 5, 10, 15, 30 or 60 minutes). Rotation uses the existing minute
tick. A manually changed page restarts the interval. The workshop's **Next
bottom panel** button previews the same order.

Holding Back was ruled out after checking the [Pebble click API](https://developer.repebble.com/docs/c/User_Interface/Clicks/):
a native watchface cannot subscribe to button clicks, and Back has a system
role. The face remains a watchface.

## Providers and offline behavior

[Open-Meteo](https://open-meteo.com/en/docs) provides temperature, relative
humidity, precipitation probability/amount, daylight flags, sunrise and sunset.
By default it uses the phone's current coordinates, rounded to about 100 m,
and the phone's IANA time zone. Location access is required in this mode; no API
key is needed. City naming and weather share a coarse, on-demand location fix,
cached for fifteen minutes. There is no continuous location tracking. Weather
asks for a fix only when its forecast needs refreshing and does not depend on
reverse city lookup succeeding. A manual main-clock city name is just a caption.

A saved city can be selected instead and needs no location permission for
weather. Existing saved selections are preserved on upgrade; choose **Weather
& humidity → Forecast location → Current location** to switch. If location
access fails, valid current-location weather remains marked **OLD**; no saved
city is silently substituted. The default refresh is one hour;
30 minutes, two hours and three hours are available. Data attribution and
service terms are in [NOTICE](../NOTICE).

[NOAA CO-OPS](https://api.tidesandcurrents.noaa.gov/api/prod/) provides hourly
harmonic predictions and high/low events. Requests use UTC and metric MLLW
(mean lower low water); display conversion happens locally. Predictions refresh
every six hours.

When Tide is enabled or its settings are opened without a saved station, the
phone suggests the closest reference (harmonic) station within 150 km. Up to
five nearby alternatives show their names and straight-line distances. The
[NOAA metadata API](https://api.tidesandcurrents.noaa.gov/mdapi/prod/) supplies
the station catalog; subordinate stations are excluded because they cannot
supply the hourly curve. Station details supply the standard UTC offset and
daylight-saving flag, which are mapped to an IANA zone independently of the
phone's own zone. Unsupported or missing time-zone metadata requires a manual
choice. The short label remains editable.

This is a setup default, saved as an ordinary fixed station. It never silently
changes an existing station while travelling. **Find nearby NOAA stations**
refreshes the alternatives; the user can choose a better match for their
waterway. Proximity alone does not establish tidal equivalence. Without a
nearby station, a network connection or location permission, eleven coastal
presets and manual ID/label/time-zone entry remain available.

Opening phone settings reuses the low-accuracy location fix shared with weather
and city naming (up to fifteen minutes old). The data-URL settings page receives
coordinates rounded to three decimal places; the coarser city-caption cache
is not used for station ranking. No coordinates are sent to NOAA. Metadata is
cached for seven days where browser storage is available, or for the current
settings session otherwise. Finding a station adds no background polling or
sensor work on the watch. These are astronomical predictions, not observed
water levels or storm-surge forecasts.

The phone caches 49 hourly samples per provider and the watch persists compact
copies. A minute tick advances through those samples without fetching each
minute. Unit/color/scale changes reuse the cache. Requests only run for enabled
data pages; failures back off for five minutes. Changing location or station
invalidates the prior cache and discards any late response for that location.
An unchanged packet does not rewrite watch storage.

A failed refresh keeps valid cached samples and marks the chart **OLD**.
Age also marks weather old after twice its refresh interval and tides after
12 hours. Once fewer than two samples remain, **FORECAST EXPIRED** replaces the
curve. Missing values are rejected instead of becoming zero-temperature,
zero-rain or zero-tide samples. No configured tide station produces **CHOOSE A
NOAA STATION**. A missing first response produces **WAITING FOR PHONE** or
**DATA UNAVAILABLE**.

The workshop starts with clearly labeled **DEMO** curves to make layout editing
possible offline. **Load live data** replaces them with provider responses.
The companion never supplies those examples to the watch.

## Verification

Automated checks cover settings migration, packet validation, missing hourly
values, current-location defaults, shared position fixes, permission failures,
travel and time-zone changes, cache reuse/backoff, late responses, fractional-hour forecast locations,
calendar parity between JavaScript and C across DST/leap/year boundaries, and
the wrist-flick and backlight guards. Browser checks cover the default pages,
live-response fixtures, page order, timed rotation, persistence, unit conversion
and mobile layout. Version 0.4.2 was verified in the native Emery emulator with
injected button and motion events: waking the backlight preserves the panel,
a later flick changes it, bursts and motion in darkness do not, the next wake
rearms the guard, and double flicks 1.5 seconds apart work. Disabling motion
preserves the panel, and gestures resume after the watch menu finishes closing.
The night saver keeps its frame through a minute tick, then a button backlight
wake updates the clock without motion. Screenshots verify the actual rendered
footer and clock after each event. These checks do not simulate physical wrist
sensitivity or screen touches.
Real provider requests were also checked for New York, Kathmandu and NOAA
station 8518750 (The Battery).

The 0.4.1 current-location change was also checked in the Emery emulator with
forecast packets, automatic city coordinates, a manual clock caption, unavailable
weather and restored data. All AppMessages were acknowledged and each state rendered.

Physical wrist-motion sensitivity, power consumption and phone webview behavior
still need hardware testing. The [accelerometer API](https://developer.repebble.com/docs/c/Foundation/Event_Service/AccelerometerService/)
documents the available sampling rates and batching. U.S. observed holiday
rules follow the [OPM calendar](https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/).
Other regions mark national public holidays on their calendar dates (fixed
dates, nth-weekday rules and Western Easter offsets); substitute weekdays and
state or provincial holidays are not shown. Browser and watch agree on every
holiday from 2024 through 2030 in host tests.
