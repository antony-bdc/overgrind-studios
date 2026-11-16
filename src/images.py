# Builds the WebP versions of every game image. Run after replacing a file in assets/games/*.jpg
import glob, os
from PIL import Image
here = os.path.join(os.path.dirname(__file__), '..', 'assets', 'games')
for f in sorted(glob.glob(os.path.join(here, '*.jpg'))):
    k = os.path.splitext(os.path.basename(f))[0]
    im = Image.open(f).convert('RGB')
    for w, suffix in [(1600, ''), (800, '-800')]:
        r = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS) if im.width != w else im
        r.save(os.path.join(here, f'{k}{suffix}.webp'), 'WEBP', quality=80, method=6)
    print(k, 'ok')
