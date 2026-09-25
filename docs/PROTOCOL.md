# Settings packet v7

The watch accepts one 232-byte AppMessage byte array named `SETTINGS` (10000).
`REQUEST` (10001) asks the companion to refresh. All multi-byte values are
little endian. The watch validates the entire packet before replacing its
configuration, then persists it as one record under key 1 (below Pebble's
256-byte persistence limit). Invalid and truncated messages are ignored.

| Byte | Meaning |
| --- | --- |
| 0 | Version = 7 |
| 1 | Theme, 0–13; IDs listed in `PALETTES.md` |
| 2 | Flags: day/night 1, edges 2, lights 4, motion 8, sun 16, stacked time 32, buzz on disconnect 64, also buzz on reconnect 128 |
| 3 | Format: device 0, 24h 1, 12h 2 |
| 4 | Reserved orientation byte; always 0 |
| 5–6 | Local time x/y |
| 7–8 | Map x/y |
| 9–14 | Three time-block x/y pairs |
| 15 | Enabled-place bitmask |
| 16–231 | Three 72-byte place records |

| Place-relative byte | Meaning |
| --- | --- |
| 0–7 | ASCII label, max 7 characters plus NUL |
| 8–9 | Projected map pixel x/y, relative to map origin |
| 10 | Map glyph ID, 0–11: diamond, point, ring, triangle, plus, dagger, double dagger, asterisk, pilcrow, check, cross, number |
| 11–13 | Signed unit direction components scaled by 127 |
| 14–15 | Current UTC offset in minutes, signed int16 |
| 16 | Number of cached transitions, 0–8 |
| 17 | Top-bar Moon enabled 1 or disabled 0 in record 0. Records 1 and 2 always 0. |
| 18–21 | Stale-after Unix UTC seconds, uint32; 0xffffffff if no ninth transition |
| 22–69 | Eight records: uint32 transition UTC seconds, int16 new offset minutes |
| 70 | Opaque Pebble RGB222 place color, `0xc0 | R2<<4 | G2<<2 | B2` |
| 71 | Reserved; always 0. |

`shared/protocol.js` is the writer, `watchface/src/c/settings.c` the reader.
Native and JS tests cover their agreement and exact DST boundaries.

Palette IDs are appended, preserving the four original IDs and their colors.
The generated `THEME_COUNT` sets the native validation bound and all palette
table sizes. New IDs require a watch build containing the corresponding palette;
earlier builds reject IDs outside their supported range without replacing settings.

Map resources use four bytes per pixel: signed normalized x/y/z scaled by 127,
then a flag byte. Low two bits: empty 0, ocean 1, land 2. Bit 2 indicates an edge.
The map is 200×104. The watch reads one row at a time and
caches only the 8-bit color bitmap, keeping peak map memory around 23 KB.

Version 7 keeps the independent marker color and replaces the pictogram set
with five smaller glyphs. The 232-byte packet length stays the same. The native
reader rejects older packets and persisted records; the companion regenerates
v7 packets from saved JSON on connection. Exported layout JSON remains version
1 with `markerSet: 2`. Imports without `markerSet` migrate the former 21 icon
IDs to geometric glyphs while keeping places and colors. Earlier widget
selections are discarded, while old Atlas positions become Meridian and old
Horizon positions adopt the full-width clock. Existing portrait
layouts migrate to Meridian, preserving places and display preferences. Packets
with orientation 1 are rejected.

The Moon uses eight 9×9 pixel glyphs packed into native row masks. The watch
selects the glyph from UTC date and time once per minute. Three theme colors
(background, shadow, light) are generated from `shared/palettes.js`; no lunar
image resource or phase data is sent in the settings packet. Bluetooth status
comes from the watch connection service and uses its own 7×11 pixel rune.

# Bottom-panel packets v1

The original `SETTINGS` packet stays at v7. Three additional AppMessage byte
arrays carry the footer and its caches; the watch inbox is 1,024 bytes. The
companion sends `SETTINGS`, `FOOTER` and `DISPLAY` together, then each data packet separately
through a coalescing, retried queue. Multi-byte values remain little endian.

| Key | Name | Bytes | Persistence keys |
| --- | --- | --- | --- |
| 10002 | `FOOTER` | 64 | 100 |
| 10003 | `WEATHER` | 424 | 110, 111 |
| 10004 | `TIDE` | 244 | 120, 121 |

Data persistence is split into chunks of at most 240 bytes. Length, version,
enums, boolean fields, labels, sample ranges and hourly count are validated
before replacement. Corrupt persisted records are ignored. Identical data
does not rewrite persistence. Receiving identical footer settings does not
reset the selected page.

`FOOTER` contains only watch rendering settings; coordinates, IANA zone names,
NOAA station identifiers and network caching remain in the phone's JSON.
Page IDs are zones 0, weather 1, calendar 2, humidity 3, tide 4 and health 5.
Health needs no packet: the watch reads Pebble Health itself (the app
declares the `health` capability) and nothing about it leaves the watch.

| Byte | Meaning |
| --- | --- |
| 0 | Version = 1 |
| 1–3 | Enabled boolean, page count 1–5, starting page ID |
| 4–8 | Ordered unique page IDs, unused slots = 255 |
| 9–10 | Rotation minutes (0/1/2/5/10/15/30/60, or 255 for smart rotation), horizon hours (12/24/48) |
| 11–15 | Fahrenheit; rain off/probability/amount (0–2); daylight; grid; solar heading |
| 16–20 | Week starts Sunday/Monday (0/1); previous+current weeks; weekend Sat+Sun/Fri+Sat/off (0–2); U.S. holidays; outlined today |
| 21–28 | Opaque RGB222 temperature, rain, humidity, tide, Saturday, Sunday, holiday, today colors |
| 29–30 | Fixed temperature range; automatic humidity range |
| 31–34 | Two int16 temperature bounds, tenths of selected °C/°F |
| 35–36 | Rain in inches; tide in feet |
| 37–42 | Weather refresh minutes (30/60/120/180); weather enabled; range labels; tide zero line; station configured; shake enabled |
| 43–44 | Rain scale maximum, uint16 tenths of mm/hour |
| 45 | Fixed tide range |
| 46–49 | Two int16 tide bounds, hundredths of selected meters/feet |
| 50 | Forecast source: saved place 0–2, or current phone location 3 (default since 0.4.1). Daylight follows that source; absent current-city coordinates use forecast daylight flags. |
| 51 | Humidity line on the weather chart (0/1) |
| 52 | Panel gesture: 1–3 flicks, or 4 for one flick while the backlight is already on; 0 from older phones means 2. Mode 4 requires watchface 0.4.2 or later. |
| 53–63 | Reserved zero |

The phone resolves `footer.colorMode` (`theme` or `custom`) to explicit colors
before encoding bytes 21–28. There is no footer wire-version change. Legacy
JSON without a mode preserves edited colors as custom; unchanged defaults follow
the active theme. Original themes retain their original default panel colors.

Both environmental packets start with:

| Byte | Meaning |
| --- | --- |
| 0 | Version = 1 |
| 1 | Sample count, 0 (clear/missing) or 49 |
| 2 | Flags: demonstration 1, failed refresh 2 |
| 3 | Step = 1 hour |
| 4–7 | Fetched Unix UTC seconds |
| 8–11 | First sample Unix UTC seconds; need not be a whole UTC hour |

`WEATHER` continues with next sunrise UTC (12–15), next sunset UTC (16–19),
their local minute-of-day uint16 values (20–23), and a seven-character
NUL-terminated location label (24–31). Its 49 eight-byte samples begin at 32:
temperature int16 tenths °C, humidity byte %, probability byte %, precipitation
uint16 tenths mm, daylight byte 0/1, and local hour byte 0–23.

`TIDE` continues with next high UTC (12–15), next low UTC (16–19), their int16
heights in centimeters (20–23), their local minute-of-day uint16 values (24–27),
label (28–35), station ID (36–43), and four reserved zero bytes (44–47).
Its 49 four-byte samples begin at 48: int16 predicted height in centimeters
relative to MLLW, station-local hour byte, and reserved zero byte.

The phone supplies integer, rounded canonical units; the native renderer handles
°F, inches and feet. Sample timestamps stay in UTC while cached hour and event
labels include the selected location's DST and fractional offset. The watch
selects the current sample, draws up to the configured horizon and expires a
series when fewer than two points remain. Failure flags preserve a valid cache
but mark it `OLD`. The companion never transmits demonstration data.

`shared/panel-protocol.js` writes these packets; `panel_data.c` validates them and
`panels.c` handles persistence, rotation and rendering. Exported JSON stays
version 1 and adds `footer`; older settings receive the default panel settings.

# City and numerical-display packets v1

`CITY` (10005) is 52 bytes, persisted under key 2. Byte 0 is version 1; byte 1
has manual-name flag 1, failed-refresh flag 2, position flag 4 and map-pixel
flag 8 (only with 4). With flag 8, bytes 2–3 hold the wearer's map pixel (x
below 200, y below 104; the projection lives on the phone), where the watch
draws your location; otherwise they are zero.
Bytes 4–7 are fetched Unix UTC seconds (uint32). Bytes 8–47 contain up to 39
ASCII letters, digits, spaces, periods, commas or hyphens, followed by NUL and
zero padding. An empty name clears the caption city. A nonempty automatic name
requires a timestamp. Unknown flags, corrupt names, padding and lengths are
rejected. Automatic names expire after six hours; names over two hours old or
with a failed refresh show `?`. Manual names do not expire. The watch tolerates
up to five minutes of future timestamp skew. With flag 4, bytes 48–51 hold the
wearer's latitude and longitude as int16 tenths of a degree (±900, ±1800); the
panel charts use it for sunrise and sunset. Without it they must be zero, and a
manual name never carries a position. An older 48-byte packet is rejected, so
the watch shows no city until the phone's next update.

`DISPLAY` (10006) is eight bytes, persisted under key 3:
`[3, style, options, background, power, night start, night end, low battery]`.
Style 0 selects Span, 2 selects
rounded broad numerals, 4 Chamfer figures, and 5–8 Pebble system fonts (Leco 42,
Bitham 42 Bold, Bitham 42 Light, Bitham 42 Medium Numbers) and 9 Leco Delta
(Leco 42 with 60-degree corners), drawn from the bundled `clock-glyphs.bin`
figures so the minute transition can run over them. Byte 2 bits 2–3 say when
place times also show outside the bottom panel: 0 never, 1 whenever the band
shows something else (another panel, or a Quick View card), 2 always. Bits 4–5
say where: 0 left of the clock (the default), 1 right of it, 2 on the map. Bit 6
lets map times turn 90° when that sits clearly closer. Bit 7 shows the Dymaxion
nameplate (the original pixel script) between the clock and the map, when it
clears both by a pixel; a clock below the map moves down (six pixels in
Horizon) to make room, if its figures still clear the bottom panel by six. Beside the clock needs
Chamfer or a system font (styles 4–9); Broad and Span fill the strip. On the
map, the watch places each time itself (`map_times.c`, mirrored by
`shared/map-times.js`) whenever places, the clock format, turning or a place's
day-offset reservation change; nothing extra travels from the phone. Labels
use the figure size chosen in Map time size: 3×5, 3×6 (the default) or 3×7
pixels, carried in byte 3 bits 2–3 (0 medium, 1 small, 2 large; older packets
read as medium). Every label uses it and goes wherever it fits. Byte 2 bit 1 turns the leading zero off (the first digit slot stays blank for
hours under ten). Bit 1 is clear in every older packet, so the zero stays on. Byte 3 bits 0–1 select the
map background: 0 none, 1 triangle points, 2 triangle lines, 3 fine triangle
points (the lattice split twice). Background *n* is
flag bit `4 << n` of each empty pixel in `map-0.bin` byte 3, drawn in the
palette's edge colour.
Stacked time always uses Draft. Every horizontal style uses a temporary 400 ms
minute-transition timer when the existing MOTION flag is enabled and battery is
above the low-battery level (byte 7); it adds no sensor.

Bytes 4–6 are power and motion (`shared/power.js`, mirrored by `power.c`).
Byte 4 bits 0–1 pick how often the map is reshaded for the moving sun: every 5,
10, 15 or 30 minutes (never while day and night is off, when the map does not
change with time). Bit 2 turns the minute animation off and bit 3 the marker
pulse, tray swipe and clock glide; MOTION still turns them all off. Bit 4 is
the night saver: from the hour in byte 5 until the hour in byte 6 (wrapping
past midnight; the same hour means all day) the map is reshaded every other
hour, on even hours, and nothing animates. Bit 6 also makes it night whenever
the watch's own Quiet Time is on, at any hour: `quiet_time_is_active()`, which
covers Quiet Time switched on by hand, its weekday/weekend schedule and
calendar-aware Quiet Time (apps can read only whether it is on, not its
schedule, and get no event when it changes, so the face asks at each minute
tick). Bit 5, at night, pauses redraws in the dark: the minute tick redraws only
while the backlight is on (`light_is_on()`), and the backlight coming on redraws
at once, whether motion, a button or screen touch woke it. This uses Pebble's
backlight service, without polling or touchscreen input.
Byte 7 is the battery percentage at or below which nothing
animates: 5, 10 (the default), 20 or 30. The default packet is
`[3, 4, 0, 0, 0, 22, 7, 10]`.

Four-byte version 2 packets load with default power and motion. For
compatibility with the retired LCD/framing experiment, valid version 1
packets are normalized to version 3 before use and persistence (background none): style 1 (the retired triangular
seven-segment display) becomes style 4, style 3 becomes style 2, byte 2 bit 0
(its unlit-grid switch) and byte 3 are cleared. Legacy byte 3 accepts zero, or a style of 1 or 2 in bits 0–1 with
optional flags in bits 2–5. Unknown styles, bits, lengths and flags are rejected.
This migration also runs when the watch loads its saved display preferences.

Exported JSON remains version 1. Optional `location: {mode: 'auto'|'manual', name}`,
and `clockDisplay` fields migrate from older files to automatic location and
rounded broad numerals when no explicit display choice was saved. A saved
`clockDisplay: 'lcd'` becomes `'broad'` and `'triangles'` becomes `'chamfer'`; a
legacy `segmentGrid` field is dropped; legacy
`framing` objects are discarded without changing palettes, locations or layout.
`SETTINGS` remains unchanged at 232 bytes / version 7. The city and display
records are independently validated and persisted only when changed.
