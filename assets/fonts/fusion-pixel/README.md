# Fusion Pixel Font

The watch's Chinese, Japanese and Korean lettering, and its Cyrillic and Greek
capitals that are not shaped like Latin ones, are glyphs from
[Fusion Pixel Font](https://github.com/TakWolf/fusion-pixel-font) by TakWolf:
the 10px proportional cut, release 2026.09.25, licensed under the SIL Open
Font License 1.1 (`OFL.txt`). Its glyphs come from the fonts credited in
`LICENSES/`, each under its own license.

Only the characters the watch's words use are kept, in
`assets/type/fusion-glyphs.json`, unmodified. `tools/extract-fusion-glyphs.mjs`
copies them out of the release's BDF files when a translation needs a new
character. The accents on the watch's Latin capitals are taken from the same
font and placed on the project's own Draft capitals
(`tools/watch-text-glyphs.mjs`).
