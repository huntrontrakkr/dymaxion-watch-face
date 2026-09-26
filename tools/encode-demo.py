#!/usr/bin/env python3
"""Encodes the frames from tools/capture-demo.mjs as the store's demo GIF.

Frames stay at the watch's 200x228 in its exact 64 colors (RGB222), so there is
no dithering and no scaling; repeated frames merge into longer ones."""
import base64
import io
import json
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
frames = json.loads(Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "test-results/demo-frames.json").read_text())
# The store takes the watch-size GIF, first in the gallery; the README shows it at 2x.
OUTPUTS = [(ROOT / "docs/screenshots/store/emery_00-demo.gif", 1, 1_500_000),
           (ROOT / "docs/screenshots/dymaxion-demo.gif", 2, 3_000_000)]

levels = [0, 85, 170, 255]
palette = Image.new("P", (1, 1))
palette.putpalette([c for r in levels for g in levels for b in levels for c in (r, g, b)])
images, durations = [], []
for frame in frames:
    image = Image.open(io.BytesIO(base64.b64decode(frame["png"].split(",")[1]))).convert("RGB")
    assert image.size == (200, 228)
    if images and image.tobytes() == images[-1].tobytes():
        durations[-1] += frame["ms"]
        continue
    images.append(image)
    durations.append(frame["ms"])
# GIF delays are in hundredths of a second, and browsers slow anything under 20 ms.
durations = [max(20, round(d / 10) * 10) for d in durations]
for destination, scale, limit in OUTPUTS:
    indexed = [image.resize((200 * scale, 228 * scale), Image.NEAREST).quantize(palette=palette, dither=Image.Dither.NONE) for image in images]
    indexed[0].save(destination, save_all=True, append_images=indexed[1:], duration=durations, loop=0, optimize=True)
    size = destination.stat().st_size
    print(f"{destination.relative_to(ROOT)}: {len(indexed)} frames, {sum(durations) / 1000:.1f} s, {size:,} bytes")
    assert size <= limit, f"{destination.name} must stay under {limit:,} bytes."
