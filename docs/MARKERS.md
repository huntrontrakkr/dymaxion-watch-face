# Map glyphs

Five 5×5-pixel glyphs distinguish places on the Dymaxion map. They are simple
cartographic marks, with no literal depiction of Fuller's buildings or ideas.
The small scale gives the map room to remain the subject.

![The five pixel glyphs, enlarged without interpolation](screenshots/marker-gallery.png)

| ID | Glyph | Shape |
| ---: | --- | --- |
| 0 | Diamond | Open diamond |
| 1 | Point | Filled 3×3 point |
| 2 | Ring | Open circular form |
| 3 | Triangle | Upright triangular outline |
| 4 | Plus | Small crosshair |

Each tracked place can select any glyph and its own color. The color picker
rounds to Pebble's 64-color RGB222 palette. “Use theme color” returns a place
to the current theme default. The same color appears on the map glyph, zone
label, daylight dot and short launch/settings pulse.

The six palettes starting with High Visibility also draw the chosen 5×5 glyph
beside its city label, in addition to the day/night dot. Match glyph shapes
between map and clocks when colors look alike. Default places use distinct
shapes; choosing distinct glyphs keeps custom place colors unambiguous too.

The glyphs are drawn at native resolution in `shared/markers.js`; the generator
packs the same pixels for the watch in `watchface/src/c/generated/markers.h`.
Older saved compositions with the previous 21-icon set migrate to the nearest
geometric mark while retaining location, time zone, placement and color. New
exports include `markerSet: 2`. Settings packet v7 carries the selected ID and
color in the existing 232-byte packet. See the [protocol notes](PROTOCOL.md).
