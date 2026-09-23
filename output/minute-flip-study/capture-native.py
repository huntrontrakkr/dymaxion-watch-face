import hashlib
import json
import socket
import time
from pathlib import Path
from PIL import Image, ImageEnhance

out = Path(__file__).resolve().parent
frames, report = [], []
started = time.time()
with socket.create_connection(('127.0.0.1', 37817), timeout=3) as monitor:
    def prompt():
        data = b''
        while b'(qemu)' not in data:
            data += monitor.recv(65536)
        return data
    prompt()
    while time.time() < started + 5:
        stamp = time.time()
        path = out / 'native-frame.ppm'
        monitor.sendall(('screendump ' + str(path) + '\n').encode())
        prompt()
        frame = Image.open(path).convert('RGB')
        frame.load()
        frames.append(frame)
        report.append({'ms': round((stamp-started)*1000), 'clock': hashlib.sha256(frame.crop((0, 18, 200, 58)).tobytes()).hexdigest()[:12]})
        time.sleep(max(0, .025 - (time.time()-stamp)))
changes = []
for index, row in enumerate(report):
    if not changes or row['clock'] != changes[-1]['clock']:
        changes.append(dict(row, frame=index))
gain = 255 / max(v for band in frames[-1].getextrema() for v in band)
bright = [ImageEnhance.Brightness(frame).enhance(gain) for frame in frames]
bright[-1].save(out / 'native-watch-rounded.png')
durations = [max(10, report[i+1]['ms']-row['ms']) if i+1 < len(report) else 900 for i, row in enumerate(report)]
bright[0].save(out / 'native-minute-flip.gif', save_all=True, append_images=bright[1:], duration=durations, loop=0)
for index, row in enumerate(changes):
    bright[row['frame']].save(out / ('native-transition-%02d.png' % index))
result = {'frames': len(frames), 'uniqueClockFrames': len(changes), 'changes': changes, 'brightnessCorrection': gain}
(out / 'native-check.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result), flush=True)
