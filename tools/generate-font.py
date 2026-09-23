"""Original Synergetic Mono, drawn on a compact drafting grid. Apache-2.0.

Rebuild: uv run --with fonttools==4.60.0 --with shapely==2.1.2 tools/generate-font.py
No outlines from any existing typeface are used.
"""
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from shapely.geometry import LineString, Polygon
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
# Coordinates start at the lower left. Shared diagonals/chamfers echo the map;
# full bowls and open counters keep time readable at real display resolution.
STROKES = {
    '0':['1,0 0,1 0,6 1,7 4,7 5,6 5,1 4,0 1,0','1,1 4,6'],
    '1':['1,5 2.5,7 2.5,0','1,0 4,0'],
    '2':['0,6 1,7 4,7 5,6 5,5 0,0 5,0'],
    '3':['0,7 4,7 5,6 5,4.5 4,3.5 2,3.5','4,3.5 5,2.5 5,1 4,0 0,0'],
    '4':['4,0 4,7 0,2 5,2'],
    '5':['5,7 0,7 0,3.8 4,3.8 5,2.8 5,1 4,0 0,0'],
    '6':['5,7 1,7 0,6 0,1 1,0 4,0 5,1 5,3 4,4 0,4'],
    '7':['0,7 5,7 1,0'],
    '8':['1,3.5 0,4.5 0,6 1,7 4,7 5,6 5,4.5 4,3.5 1,3.5 0,2.5 0,1 1,0 4,0 5,1 5,2.5 4,3.5'],
    '9':['5,3 1,3 0,4 0,6 1,7 4,7 5,6 5,1 4,0 0,0'],
    'A':['0,0 0,3 2.5,7 5,3 5,0','0,3 5,3'],
    'B':['0,0 0,7 3.7,7 5,5.8 5,4.6 3.7,3.5 0,3.5','3.7,3.5 5,2.4 5,1.2 3.7,0 0,0'],
    'C':['5,6 4,7 1,7 0,6 0,1 1,0 4,0 5,1'],
    'D':['0,0 0,7 3,7 5,5 5,2 3,0 0,0'],
    'E':['5,7 0,7 0,0 5,0','0,3.5 4,3.5'],
    'F':['5,7 0,7 0,0','0,3.5 4,3.5'],
    'G':['5,6 4,7 1,7 0,6 0,1 1,0 4,0 5,1 5,3.5 3,3.5'],
    'H':['0,0 0,7','5,0 5,7','0,3.5 5,3.5'],
    'I':['0.5,7 4.5,7','2.5,7 2.5,0','0.5,0 4.5,0'],
    'J':['0,1 1,0 3.5,0 4.5,1 4.5,7 1.5,7'],
    'K':['0,0 0,7','5,7 0,3.3 5,0'],
    'L':['0,7 0,0 5,0'],
    'M':['0,0 0,7 2.5,3.5 5,7 5,0'],
    'N':['0,0 0,7 5,0 5,7'],
    'O':['1,0 0,1 0,6 1,7 4,7 5,6 5,1 4,0 1,0'],
    'P':['0,0 0,7 4,7 5,6 5,4.5 4,3.5 0,3.5'],
    'Q':['1,0 0,1 0,6 1,7 4,7 5,6 5,1 4,0 1,0','3,2 5,-.5'],
    'R':['0,0 0,7 4,7 5,6 5,4.5 4,3.5 0,3.5','2.5,3.5 5,0'],
    'S':['5,6 4,7 1,7 0,6 0,4.7 1,3.7 4,3.3 5,2.3 5,1 4,0 1,0 0,1'],
    'T':['0,7 5,7','2.5,7 2.5,0'],
    'U':['0,7 0,1 1,0 4,0 5,1 5,7'],
    'V':['0,7 0,5 2.5,0 5,5 5,7'],
    'W':['0,7 0,0 2.5,3.5 5,0 5,7'],
    'X':['0,7 5,0','5,7 0,0'],
    'Y':['0,7 2.5,3.5 5,7','2.5,3.5 2.5,0'],
    'Z':['0,7 5,7 0,0 5,0'],
    '-':['.5,3.5 4.5,3.5'],'+':['.5,3.5 4.5,3.5','2.5,1.5 2.5,5.5'],
    '/':['0,0 5,7'],'%':['0,0 5,7','0,5 0,7 1.5,7 1.5,5 0,5','3.5,0 3.5,2 5,2 5,0 3.5,0'],
    '?':['0,6 1,7 4,7 5,6 5,5 2.5,3 2.5,2'],
}
glyphs = {}; metrics = {}; cmap = {}
for ch in [' ',':','.'] + list(STROKES):
    shapes=[]
    for stroke in STROKES.get(ch,[]):
        pts=[(65+float(p.split(',')[0])*94,70+float(p.split(',')[1])*94) for p in stroke.split()]
        shapes.append(LineString(pts).buffer(45,cap_style=2,join_style=3))
    if ch in ':?.':
        for cy in ([250,550] if ch==':' else [70]):
            shapes.append(Polygon([(300,cy-50),(350,cy),(300,cy+50),(250,cy)]))
    pen=TTGlyphPen(None)
    if shapes:
        shape=unary_union(shapes)
        for poly in ([shape] if shape.geom_type=='Polygon' else shape.geoms):
            poly=orient(poly,sign=-1)
            for ring in [poly.exterior,*poly.interiors]:
                pts=list(ring.coords)[:-1]
                pen.moveTo(tuple(round(v) for v in pts[0]))
                for pt in pts[1:]:pen.lineTo(tuple(round(v) for v in pt))
                pen.closePath()
    name=f'uni{ord(ch):04X}'
    glyphs[name]=pen.glyph();metrics[name]=(600,20 if ch!=' ' else 0);cmap[ord(ch)]=name
# Lowercase aliases make browser labels usable without silently falling back.
for ch in 'abcdefghijklmnopqrstuvwxyz':cmap[ord(ch)]=cmap[ord(ch.upper())]
glyphs['.notdef']=glyphs[cmap[ord('?')]];metrics['.notdef']=(600,20)
fb=FontBuilder(1000,isTTF=True)
fb.setupGlyphOrder(['.notdef',*sorted(k for k in glyphs if k!='.notdef')])
fb.setupCharacterMap(cmap);fb.setupGlyf(glyphs);fb.setupHorizontalMetrics(metrics)
fb.setupHorizontalHeader(ascent=850,descent=-150)
fb.setupNameTable({'familyName':'Synergetic Mono','styleName':'Regular','uniqueFontIdentifier':'Dymaxion Synergetic Mono 1.0','fullName':'Synergetic Mono Regular','psName':'SynergeticMono-Regular','version':'Version 1.0','copyright':'Copyright 2026 Dymaxion contributors. Licensed under Apache-2.0.'})
fb.setupOS2(sTypoAscender=850,sTypoDescender=-150,usWinAscent=850,usWinDescent=150,sxHeight=700,sCapHeight=700)
fb.setupPost(isFixedPitch=1);fb.setupMaxp()
fb.font['head'].created=fb.font['head'].modified=3872880000
dest=ROOT/'watchface/resources/fonts/SynergeticMono.ttf';dest.parent.mkdir(parents=True,exist_ok=True)
fb.save(dest)
print(f'{dest.relative_to(ROOT)}: {dest.stat().st_size} bytes, {len(glyphs)} original glyphs')
