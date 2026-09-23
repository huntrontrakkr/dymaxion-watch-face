"""Build original Dymaxion Draft and Span pixel cuts. Apache-2.0.

Requirements: fonttools, freetype-py, pillow, cairosvg. No reference font is
opened: Draft masters come from draft-lettering.py and Span is drawn below. Filled pixel runs
become grid-aligned TrueType contours, preserving the exact native bitmaps.
"""
import io
import json
import runpy
from pathlib import Path

import cairosvg
import freetype
from PIL import Image
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

ROOT = Path(__file__).resolve().parents[1]
MASTER = runpy.run_path(str(ROOT / 'tools/draft-lettering.py'))
DEST = ROOT / 'watchface/resources/fonts'
PUBLIC = ROOT / 'designer/public/type'


def pixel_glyph(rows, baseline=None, advance=None):
    width = len(rows[0])
    assert all(len(row) == width for row in rows)
    runs = []
    for y, row in enumerate(rows):
        x = 0
        while x < width:
            if row[x] != '#':
                x += 1
                continue
            start = x
            while x < width and row[x] == '#':
                x += 1
            runs.append([start, y, x - start])
    return {'a': advance if advance is not None else width + 1,
            'l': 0, 't': baseline if baseline is not None else len(rows), 'r': runs}


def text_glyphs(oldstyle):
    out = {}
    for char, rows in MASTER['TEXT'].items():
        if oldstyle and char in MASTER['TEXT_OLD']:
            rows = MASTER['TEXT_OLD'][char]
        baseline = 5 if char in 'gpqy' or oldstyle and char in '01234579' else 7 if char in 'j,' else len(rows)
        advance = 6 if char.isdigit() else 3 if char in 'i:' else 4 if char in ' l' else None
        out[char] = pixel_glyph(rows, baseline, advance)
    return out


def zone_glyphs(oldstyle):
    out = {}
    for char, rows in MASTER['ZONE'].items():
        baseline = 12
        if oldstyle and char in '012':
            rows = [row for i, row in enumerate(rows) if i not in (4, 6, 8)]
            baseline = 9
        elif oldstyle and char in '34579':
            baseline = 9
        out[char] = pixel_glyph(rows, baseline, 11)
    out[':'] = pixel_glyph(['..','..','##','##','..','..','..','..','##','##','..','..'],12,4)
    out['?'] = pixel_glyph(MASTER['TEXT']['?'],7,6)
    return out


def display_glyphs(oldstyle):
    out = {}
    for char, path in MASTER['DISPLAY'].items():
        height, baseline = (22,22) if oldstyle and char in '012' else (28,22) if oldstyle and char in '34579' else (28,28)
        # Pixel-size optical cut: rasterize authored curves directly at 28px.
        # An extra row admits the deliberate bowl overshoot on 3/5/6/8/9.
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="26" height="31"><g transform="translate(1 0) scale({23/24} {height/34})"><path fill="white" fill-rule="evenodd" d="{path}"/></g></svg>'
        image = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode()))).convert('RGBA')
        rows = [''.join('#' if image.getpixel((x,y))[3] >= 128 else '.' for x in range(26)) for y in range(31)]
        out[char] = pixel_glyph(rows,baseline,26)
    out[':'] = pixel_glyph(['...']*5+['###']*3+['...']*12+['###']*3+['...']*5,28,9)
    # Center the narrow punctuation in its own small advance, never a digit box.
    out[':']['l'] = 3
    out['?'] = pixel_glyph(MASTER['TEXT']['?'],7,6)
    return out


# A dedicated wide watch-clock cut. Each digit has a 45-pixel advance, while
# the stems keep a three-pixel weight instead of expanding with the counters.
# Long horizontals and clipped turns are drawn here from scratch.
SPAN_PATHS = {
    '0': 'M9 2H33L39 8V20L33 26H9L3 20V8Z',
    '1': 'M5 10L18 2H22V26 M6 26H39',
    '2': 'M3 9L9 2H33L39 8V11L34 16L8 23L3 26H39',
    '3': 'M3 2H33L39 8V10L33 14H17 M33 14L39 18V20L33 26H3',
    '4': 'M32 2L3 17V19H39 M32 2V26',
    '5': 'M39 2H5L3 13H32L39 18V20L33 26H3',
    '6': 'M36 3H13L7 8L3 14V20L9 26H33L39 20V18L33 13H4',
    '7': 'M3 2H39V5L18 26',
    '8': 'M9 2H33L39 8V10L33 14H9L3 10V8Z M9 14H33L39 19V20L33 26H9L3 20V19Z',
    '9': 'M3 25H29L35 21L39 14V8L33 2H9L3 8V10L9 15H38',
}


def span_glyphs():
    out = {}
    for char, path in SPAN_PATHS.items():
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="44" height="29">'
               f'<g transform="translate(1 0)"><path d="{path}" fill="none" '
               'stroke="white" stroke-width="3.2" stroke-linecap="round" '
               'stroke-linejoin="round"/></g></svg>')
        image = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode()))).convert('RGBA')
        rows = [''.join('#' if image.getpixel((x,y))[3] >= 128 else '.' for x in range(44)) for y in range(29)]
        out[char] = pixel_glyph(rows, 28, 45)
    out[':'] = pixel_glyph(['............']*5 +
                           ['.....##.....','....####....','.....##.....'] +
                           ['............']*11 +
                           ['.....##.....','....####....','.....##.....'] +
                           ['............']*7, 28, 10)
    out['?'] = pixel_glyph(MASTER['TEXT']['?'], 7, 8)
    return out


def save_font(glyphs, filename, role, size):
    font = FontBuilder(size * 64, isTTF=True)
    family = 'Dymaxion Span' if role == 'Span' else 'Dymaxion Draft ' + role
    postscript = 'DymaxionSpan' if role == 'Span' else 'DymaxionDraft-' + role
    cmap = {ord(c): 'uni%04X' % ord(c) for c in glyphs}
    glyph_data, metrics = {}, {}
    for char, bitmap in glyphs.items():
        pen = TTGlyphPen(None)
        for x, y, length in bitmap['r']:
            left = (x + bitmap['l']) * 64
            bottom = (bitmap['t'] - y - 1) * 64
            pen.moveTo((left,bottom))
            pen.lineTo((left,bottom+64))
            pen.lineTo((left+length*64,bottom+64))
            pen.lineTo((left+length*64,bottom))
            pen.closePath()
        name = cmap[ord(char)]
        glyph_data[name] = pen.glyph()
        lsb = min((x+bitmap['l'] for x,y,length in bitmap['r']), default=0)*64
        metrics[name] = (bitmap['a']*64,lsb)
    glyph_data['.notdef'] = glyph_data[cmap[ord('?')]]
    metrics['.notdef'] = metrics[cmap[ord('?')]]
    # Sorting makes regeneration stable across Python hash seeds.
    font.setupGlyphOrder(['.notdef',*sorted(name for name in glyph_data if name!='.notdef')])
    font.setupCharacterMap(cmap)
    font.setupGlyf(glyph_data)
    font.setupHorizontalMetrics(metrics)
    font.setupHorizontalHeader(ascent=(size-2)*64,descent=-2*64)
    font.setupNameTable({'familyName':family,'styleName':'Regular',
                        'uniqueFontIdentifier':family+' 0.1',
                        'fullName':family,'psName':postscript,
                        'version':'Version 0.1','copyright':'Copyright 2026 Dymaxion contributors. Apache-2.0. Original pixel masters.'})
    font.setupOS2(sTypoAscender=(size-2)*64,sTypoDescender=-2*64,
                  usWinAscent=(size-2)*64,usWinDescent=2*64,
                  sxHeight=(5 if role=='Micro' else 22 if role in ('Display','Span') else 9)*64,
                  sCapHeight=(7 if role=='Micro' else 28 if role in ('Display','Span') else 12)*64)
    font.setupPost(isFixedPitch=0)
    font.setupMaxp()
    font.font['head'].created = font.font['head'].modified = 3872880000
    font.save(DEST/filename)
    # Round-trip through exactly the rasterization mode used by Pebble.
    face = freetype.Face(str(DEST/filename));face.set_pixel_sizes(0,size)
    for char, bitmap in glyphs.items():
        face.load_char(char,freetype.FT_LOAD_RENDER|freetype.FT_LOAD_MONOCHROME|freetype.FT_LOAD_TARGET_MONO)
        slot=face.glyph;b=slot.bitmap
        actual={(slot.bitmap_left+x,y-slot.bitmap_top) for y in range(b.rows) for x in range(b.width)
                if b.buffer[y*b.pitch+x//8] & (128>>(x%8))}
        intended={(bitmap['l']+x+dx,y-bitmap['t']) for x,y,length in bitmap['r'] for dx in range(length)}
        assert actual==intended,(role,char,'pixel mismatch')
        assert slot.advance.x//64==bitmap['a'],(role,char,'advance mismatch')


draft={'name':'Dymaxion Draft','sizes':[44,18,12],'supportsOldstyle':True}
for style in ['lining','oldstyle','text']:
    draft[style]={'large':display_glyphs(style=='oldstyle'),
                  'zone':zone_glyphs(style=='oldstyle'),
                  'small':text_glyphs(style!='lining')}
save_font(draft['lining']['large'],'DymaxionDraftDisplay.ttf','Display',44)
save_font(draft['lining']['zone'],'DymaxionDraftZone.ttf','Zone',18)
save_font(draft['text']['small'],'DymaxionDraftMicro.ttf','Micro',12)
span={'name':'Dymaxion Span','sizes':[44],'lining':{'large':span_glyphs()}}
save_font(span['lining']['large'],'DymaxionSpan.ttf','Span',44)
# The native clock draws these same pixel runs directly. Pebble's text layout
# adds hidden side bearings at this extreme width and can wrap the last digit.
order='0123456789:'
runs=[]
offsets=[0]
for char in order:
    runs.extend(span['lining']['large'][char]['r'])
    offsets.append(len(runs))
native=ROOT/'watchface/src/c/generated/span_font.h'
native.parent.mkdir(parents=True,exist_ok=True)
native.write_text('// Generated by tools/generate-draft.py; exact Dymaxion Span pixel runs.\n'
                  'typedef struct { uint8_t x,y,length; } SpanRun;\n'
                  'static const uint16_t SPAN_OFFSETS[12] = {'+','.join(map(str,offsets))+'};\n'
                  'static const SpanRun SPAN_RUNS[] = {\n'+
                  ',\n'.join('  {'+','.join(map(str,run))+'}' for run in runs)+'\n};\n')
PUBLIC.mkdir(parents=True,exist_ok=True)
(PUBLIC/'draft.json').write_text(json.dumps(draft,separators=(',',':')))
(PUBLIC/'span.json').write_text(json.dumps(span,separators=(',',':')))
proof_path=PUBLIC/'proofs.json'
proofs=json.loads(proof_path.read_text()) if proof_path.exists() else {}
proofs['draft']=draft
proofs['span']=span
proof_path.write_text(json.dumps(proofs,separators=(',',':')))
print('Dymaxion Draft and Span: all native glyph pixels verified exactly.')
