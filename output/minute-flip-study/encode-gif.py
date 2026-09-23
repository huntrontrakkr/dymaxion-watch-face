from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent
frames = [Image.open(root / 'gif-frames' / f'{ms:03d}.png').convert('RGB') for ms in range(0, 401, 20)]
palette = Image.new('P', (1, 1))
colors = [channel for r in (0, 85, 170, 255) for g in (0, 85, 170, 255) for b in (0, 85, 170, 255) for channel in (r, g, b)]
palette.putpalette(colors + [0] * (768 - len(colors)))
# 400 ms of animation, bracketed by 1.2 s and 1.6 s still holds.
durations = [1220] + [20] * 19 + [1600]

for name, crop, scale in [('dymaxion-minute-flip.gif', None, 2), ('dymaxion-minute-flip-closeup.gif', (0, 18, 200, 58), 4)]:
    output = []
    for frame in frames:
        image = frame.crop(crop) if crop else frame
        image = image.resize((image.width * scale, image.height * scale), Image.Resampling.NEAREST)
        output.append(image.quantize(palette=palette, dither=Image.Dither.NONE))
    destination = root / name
    output[0].save(destination, save_all=True, append_images=output[1:], duration=durations, loop=0, disposal=1, optimize=False)
    with Image.open(destination) as gif:
        total = 0
        for index in range(gif.n_frames):
            gif.seek(index)
            total += gif.info['duration']
        assert total == sum(durations) == 3200
        assert gif.info.get('loop') == 0
        assert gif.convert('RGB').tobytes() == output[-1].convert('RGB').tobytes()
        print(f'{destination.name}: {gif.size}, {gif.n_frames} frames, {total} ms loop, {destination.stat().st_size} bytes')
