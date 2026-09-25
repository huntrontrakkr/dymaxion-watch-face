"""A 25x25 faceted globe for Pebble's watchface selector.

The pixel master is an orthographic icosahedron, tilted 20 degrees toward the
viewer. Broad amber daylight faces meet blue shadow faces, with solid seams
and a transparent surround. All colors are native RGB222; no antialiasing.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SIZE = 25
# Transparent, night, seams, ocean, amber, warm light, pale light.
COLORS = {'.': (0, 0, 0), 'n': (0, 0, 85), 'b': (0, 85, 85),
          'o': (0, 85, 170), 'a': (255, 170, 0), 'p': (255, 170, 85),
          'w': (255, 255, 170)}
ROWS = [
    '.........................',
    '.........................',
    '.....bbbbbbbbbbbbbbb.....',
    '....bbbpppppppppppbbb....',
    '....bwwbpppppppppbaab....',
    '...bbwwwbpppppppbaaabb...',
    '...bbwwwwbpppppbaaaabb...',
    '..bbwwwwwwbpppbaaaaaabb..',
    '..bbwwwwwwwbpbaaaaaaabb..',
    '.bwbwwwwwwwbbbaaaaaaabob.',
    '.bbwwwwwwbbabobbaaaaaabb.',
    '.bbwwwwbbaaabooobbaaaabb.',
    '.bbwwbbaaaaabooooobbaabb.',
    '.bwbbaaaaaaabooooooobbab.',
    '.bbaaaaaaaaabooooooooobb.',
    '.bbbaaaaaaaaboooooooobbb.',
    '..bobaaaaaaabooooooobnb..',
    '..boobaaaaaaboooooobnnb..',
    '...boobbaaaaboooobbnnb...',
    '...boooobaaabooobnnnnb...',
    '....boooobaaboobnnnnb....',
    '....booooobbbbbnnnnnb....',
    '.....bbbbbbbbbbbbbbb.....',
    '.........................',
    '.........................',
]
assert len(ROWS) == SIZE and all(len(row) == SIZE for row in ROWS)
assert all(channel % 85 == 0 for color in COLORS.values() for channel in color)

image = Image.new('P', (SIZE, SIZE))
image.putpalette([channel for color in COLORS.values() for channel in color])
image.putdata([list(COLORS).index(pixel) for row in ROWS for pixel in row])
path = ROOT / 'watchface/resources/images/menu-icon.png'
path.parent.mkdir(parents=True, exist_ok=True)
image.save(path, bits=4, transparency=0, optimize=True)
print(f'Watch selector icon: {SIZE}x{SIZE}, RGB222, transparent, {path.stat().st_size} bytes.')

if __name__ == '__main__':
    # Native size and 4x nearest-neighbor proofs on light and dark backgrounds.
    rgba = Image.open(path).convert('RGBA')
    proof = Image.new('RGB', (240, 144))
    for x, background in [(0, '#f1efe6'), (120, '#000000')]:
        proof.paste(background, (x, 0, x + 120, 144))
        proof.paste(rgba, (x + 48, 5), rgba)
        large = rgba.resize((100, 100), Image.Resampling.NEAREST)
        proof.paste(large, (x + 10, 36), large)
    output = ROOT / 'test-results/menu-icon-proof.png'
    output.parent.mkdir(parents=True, exist_ok=True)
    proof.save(output)
