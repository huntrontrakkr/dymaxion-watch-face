# PebbleOS system fonts (preview data)

These `.pbf` files are unmodified copies of PebbleOS system fonts, from
[coredevices/PebbleOS at 9399f564](https://github.com/coredevices/PebbleOS/tree/9399f564fb5035057a9174025d2c6c625e942285/resources/normal/base/pbf)
(release v4.37.0), licensed under the Apache License 2.0 (`LICENSE`).
Copyright Google LLC, Core Devices LLC and other PebbleOS contributors.

The watch face does not bundle them: on the watch the same fonts are read from
the firmware with `fonts_get_system_font`. `tools/generate-system-clock.mjs`
reads these files as data to produce the workshop's pixel-exact preview glyphs
(`assets/type/system-clock.json`) and the native placement constants.

**Modified work:** Leco Delta (`leco-delta`) is derived from `LECO_42_NUMBERS`.
`deltaRows` in `tools/generate-system-clock.mjs` cuts every exposed corner of
its digit and colon bitmaps on a line 60 degrees from horizontal; the result is
bundled in the watch app (`watchface/src/c/generated/system_clock.h`) and the
workshop preview. The unmodified fonts are not bundled.
