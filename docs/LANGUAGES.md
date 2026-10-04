# Languages

The face and the phone settings page speak 19 languages. The face draws 17 of
them; Arabic and Hindi translate the settings page, and the face stays in
English until its lettering can join Arabic and shape Devanagari.

| Language | Face | Settings page |
| --- | --- | --- |
| English, Spanish, French, German, Italian, Portuguese, Dutch, Polish, Turkish, Indonesian | Draft capitals, accents added | yes |
| Russian, Ukrainian, Greek | Draft capitals where the letter is Latin-shaped; Fusion Pixel for the rest | yes |
| Simplified and Traditional Chinese, Japanese, Korean | Fusion Pixel 10px | yes |
| Arabic (right to left), Hindi | English | yes |

**Automatic**, the default, follows the phone: the settings page reads the
phone's languages and saves the first it knows, and the companion sends that
to the watch. Choosing a language in the settings page (or **Face language** in
the workshop) overrides it. The page changes language at once.

## The face's words

Everything the face writes is in `shared/watch-text.js`: weekday and month
names, the calendar's day initials, the date and calendar-title patterns, the
panel titles and messages, and the short words in chart headings (rain, max,
relative humidity, steps, heart rate, typical). They are capitals, because the
watch's lettering is. Units, AM/PM and place names stay as they are. Each
pattern places `{w}` weekday, `{d}`/`{dd}` day, `{m}` month and `{y}` year in
the language's own order: `10月7日（水）` in Japanese, `MI 07. OKT` in German.

`tools/generate-watch-text.mjs` turns the table into one resource per language
(`watchface/resources/data/text-<code>.bin`, 0.4–2.6 KB): the words, then
bitmaps of only the glyphs those words need beyond the Draft capitals. It also
checks that every word fits where the watch draws it, and writes the glyphs to
`shared/watch-glyphs.json` for the previews. The capitals renderer
(`caps.c`) reads UTF-8 and takes a glyph from the language before the Draft
capitals; `tests/watch-text.test.mjs` checks, for every language, that the
watch draws every word pixel for pixel as the previews do.

Where Fusion Pixel is used, accents are its own marks set on the Draft
capitals, so a word keeps one style: an accented capital is the Draft letter
plus the pixels Fusion Pixel's accented letter has beyond its plain one,
centred over the Draft letter. Ł is drawn by hand, because the stroke does not
sit on the Draft stem. Fusion Pixel is SIL Open Font License 1.1; only the
characters in use are kept (`assets/type/fusion-glyphs.json`), and
`tools/extract-fusion-glyphs.mjs` adds more from the release's BDF files. See
`assets/fonts/fusion-pixel/`.

When the heart rate would meet the right-hand label in the Health heading, the
heading drops it rather than overlap (both on the watch and in the previews).

## The settings page

The page is written in English. `i18n/ui/source.json` lists every string it
shows, and `i18n/ui/<code>.json` gives each one in a language, line for line;
a `{}` stands for a number or name, which is translated too when it is one of
the page's own words (`Include {}` with `Weather`). A translation may number
them, `{2}` before `{1}`, to change their order. `tools/generate-ui-text.mjs`
checks every file is complete and packs them into `shared/ui-text.json`.

`shared/ui-language.js` translates the page as it is drawn, so the controls
need no changes: every text and label is swapped for its translation whenever
the code writes it, and the English is remembered so another language can be
chosen later. Arabic turns the page right to left.

The page travels to the phone as a `data:` URL, which phones and browsers
limit to about 2 MB once percent-encoded. Its translations are packed as
base64, which percent-encoding leaves alone, and its time zones are the rules
for the coming 25 years rather than their whole history. With every language,
the page is 1.42 MB; `tests/language-browser.mjs` keeps it under 1.8 MB and
checks that every language translates every string, fits a 320-pixel phone
and lays out right to left where it should.

The translations were written for this release, not by native speakers.
Corrections are welcome: change the line in `i18n/ui/<code>.json` (or the
word in `shared/watch-text.js`) and run `npm run text`, which rebuilds the
face's resources and the settings page.
