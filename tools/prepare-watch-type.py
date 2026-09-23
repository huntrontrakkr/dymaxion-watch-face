"""Prepare existing OFL typefaces for Pebble's bitmap renderer and type studies.

No letterforms are redrawn. Numeral substitutions are baked into the cmap
because Pebble does not execute OpenType features. Browser proofs use the
same FreeType monochrome loading flags as the SDK, without pair kerning.

Run with fonttools and freetype-py installed.
"""
import io
import json
from pathlib import Path

import freetype
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'assets/fonts'
OUT = ROOT / 'watchface/resources/fonts'
PUBLIC = ROOT / 'designer/public/type'
PUBLIC.mkdir(parents=True, exist_ok=True)
CHARS = ''.join(chr(c) for c in range(32, 127))
FAMILIES = {
    'alegreya': ('AlegreyaSans-Medium.ttf', 'Alegreya Sans', [54, 18, 12]),
    'fira': ('FiraSans-Medium.ttf', 'Fira Sans', [50, 17, 11]),
    'recursive': ('Recursive.ttf', 'Recursive Sans', [49, 17, 11]),
}


def feature(font, tag, names):
    indices = sorted({i for record in font['GSUB'].table.FeatureList.FeatureRecord
                      if record.FeatureTag == tag for i in record.Feature.LookupListIndex})
    for index in indices:
        for table in font['GSUB'].table.LookupList.Lookup[index].SubTable:
            table = getattr(table, 'ExtSubTable', table)
            mapping = getattr(table, 'mapping', {})
            names = {code: mapping.get(name, name) for code, name in names.items()}
    return names


def prepare(key, style):
    filename, title, sizes = FAMILIES[key]
    font = TTFont(SOURCES / key / filename, recalcTimestamp=False)
    if 'fvar' in font:
        font = instantiateVariableFont(font, {'MONO': 0, 'CASL': .35, 'wght': 500,
                                             'slnt': 0, 'CRSV': 0}, inplace=True)
    names = font.getBestCmap().copy()
    # Lining/tabular clocks; oldstyle/tabular alternative; proportional text.
    tags = ['lnum', 'tnum'] if style == 'lining' else ['tnum', 'onum'] if style == 'oldstyle' else ['pnum', 'onum']
    for tag in tags:
        names = feature(font, tag, names)
    for table in font['cmap'].tables:
        if table.isUnicode():
            for code in table.cmap:
                if code in names:
                    table.cmap[code] = names[code]
    # Distinguish the prepared subset from the upstream font installation.
    family = title + ' Watch ' + style.title()
    for record in font['name'].names:
        if record.nameID in (1, 3, 4, 6, 16):
            value = family.replace(' ', '') if record.nameID == 6 else family
            record.string = value.encode(record.getEncoding())
    options = subset.Options()
    options.layout_features = []  # The selected glyphs now live in the cmap.
    sub = subset.Subsetter(options=options)
    sub.populate(text=CHARS)
    sub.subset(font)
    buf = io.BytesIO()
    font.save(buf)
    return font, buf.getvalue()


def raster(data, size):
    face = freetype.Face(io.BytesIO(data))
    face.set_pixel_sizes(0, size)
    out = {}
    for char in CHARS:
        face.load_char(char, freetype.FT_LOAD_RENDER | freetype.FT_LOAD_MONOCHROME | freetype.FT_LOAD_TARGET_MONO)
        slot = face.glyph
        bitmap = slot.bitmap
        runs = []
        for y in range(bitmap.rows):
            start = None
            for x in range(bitmap.width + 1):
                on = x < bitmap.width and bitmap.buffer[y * bitmap.pitch + x // 8] & (128 >> (x % 8))
                if on and start is None:
                    start = x
                if not on and start is not None:
                    runs.append([start, y, x - start])
                    start = None
        out[char] = {'a': slot.advance.x // 64, 'l': slot.bitmap_left, 't': slot.bitmap_top, 'r': runs}
    return out


proofs = {}
for key, (filename, title, sizes) in FAMILIES.items():
    proofs[key] = {'name': title, 'sizes': sizes, 'supportsOldstyle': key != 'recursive'}
    for style in ['lining', 'oldstyle', 'text']:
        font, data = prepare(key, style)
        proofs[key][style] = {role: raster(data, size) for role, size in zip(['large', 'zone', 'small'], sizes)}
        if key == 'alegreya' and style in ('lining', 'text'):
            (OUT / ('AlegreyaClock.ttf' if style == 'lining' else 'AlegreyaText.ttf')).write_bytes(data)
        if style != 'text':
            cmap = font.getBestCmap()
            advances = {font['hmtx'][cmap[ord(c)]][0] for c in '0123456789'}
            assert len(advances) == 1, (key, style, advances)
    (PUBLIC / (key + '-OFL.txt')).write_bytes((SOURCES / key / 'OFL.txt').read_bytes())
(OUT / 'Alegreya-OFL.txt').write_bytes((SOURCES / 'alegreya/OFL.txt').read_bytes())
for original in ('draft', 'span'):
    if (PUBLIC / (original + '.json')).exists():
        proofs[original]=json.loads((PUBLIC / (original + '.json')).read_text())
(PUBLIC / 'proofs.json').write_text(json.dumps(proofs, separators=(',', ':')))

print('Prepared three bitmap reference families.')
