#!/usr/bin/env python3
"""
Turns raw generated art from art-inbox/ into game assets.

    python3 tools/art/import.py            # everything in art-inbox/
    python3 tools/art/import.py ships      # one group
    python3 tools/art/import.py --inbox some/dir ships

Three treatments:
  key    objects on black: the black around the object becomes transparent, the image is
         trimmed to the object, squared and scaled
  mask   white emblems on black: brightness becomes opacity, so the game can colour them
  cover  painted scenes: cropped to the target shape and scaled

Every file is checked and reported: wrong name, wrong shape, background not black.
Requires Pillow and numpy.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'packages/client/src/assets'

SHIPS = ['sperling', 'kormoran', 'lanze', 'nachtfalter', 'basilisk', 'leviathan']
FACTIONS = ['tessera', 'asche', 'helix', 'zenit']
ROLES = ['pilot', 'trader', 'tech', 'gunner', 'smuggler']
GOODS = ['water', 'hydro', 'ore', 'fuelcells', 'machines', 'reactor', 'drones', 'jammers', 'meds', 'stims', 'prosthetics',
         'neurolinks', 'boosters', 'implants', 'starcharts', 'secrets', 'blackcode', 'aicores', 'huntarms', 'plasma', 'emp',
         'lumen', 'neurostaub', 'schlaftau', 'spices', 'art', 'artifacts']
STATIONS = ['meridian', 'kessin', 'helixtor', 'zenit', 'varn', 'lumen', 'corvus', 'aurel']

# Delivered files that are held back, with the reason. They stay in art-inbox until replaced.
HELD = {
    'cards/g094': 'Rüstung erinnert stark an eine bekannte Film-Rüstung: mit dem neuen Prompt aus Dokument 06 neu erzeugen',
}

# group -> list of (names or None for any, treatment, settings)
GROUPS = {
    'ships': [(SHIPS, 'key', dict(size=640))],
    'crates': [(['standard', 'premium', 'standard-open', 'premium-open'], 'key', dict(size=512))],
    'goods': [(GOODS, 'key', dict(size=192))],
    'modules': [(['shield', 'drive', 'jammer', 'pods', 'charger', 'stash'], 'key', dict(size=192))],
    'currency': [(['credits', 'quanta', 'shards'], 'key', dict(size=192))],
    'stations': [(STATIONS, 'key', dict(size=900))],
    'emblems': [
        (FACTIONS, 'mask', dict(size=256)),
        (['bronze', 'silber', 'gold', 'platin', 'diamant', 'prestige'], 'key', dict(size=384)),
    ],
    'cards': [(None, 'cover', dict(w=640, h=800))],
    'archetypes': [([f'{f}-{r}' for f in FACTIONS for r in ROLES], 'cover', dict(w=640, h=800))],
    'encounters': [(['pirates-1', 'pirates-2', 'customs-1', 'customs-2'], 'cover', dict(w=1170, h=780))],
    'banners': [
        (['season-0', 'season-1', 'season-2', 'season-3', 'event-blockade'], 'cover', dict(w=1170, h=390)),
        (['keyart'], 'cover', dict(w=828, h=1472)),
        # The store graphic is not part of the game: it goes to docs/store as PNG.
        (['feature'], 'cover', dict(w=1024, h=500, out='docs/store', name='feature-1024x500.png')),
    ],
}


def background_mask(rgb: np.ndarray, threshold: float) -> np.ndarray:
    """Pixels that are near black AND connected to the border: the backdrop, not dark parts of the object."""
    dark = (rgb.max(axis=2) < threshold * 255).astype(np.uint8) * 255
    # A copy, because an image made from an array is read-only and the fill would be lost.
    img = Image.fromarray(dark, 'L').copy()
    h, w = dark.shape
    border = [(x, 0) for x in range(0, w, 4)] + [(x, h - 1) for x in range(0, w, 4)] \
        + [(0, y) for y in range(0, h, 4)] + [(w - 1, y) for y in range(0, h, 4)]
    for xy in border:
        if img.getpixel(xy) == 255:
            ImageDraw.floodfill(img, xy, 128)
    return np.asarray(img) == 128


def square_trim(img: Image.Image, pad: float = 0.05) -> Image.Image:
    box = img.getchannel('A').point(lambda a: 255 if a > 10 else 0).getbbox()
    if not box:
        return img
    img = img.crop(box)
    side = int(max(img.size) * (1 + 2 * pad))
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
    return canvas


def treat_key(src: Image.Image, size: int, notes: list) -> Image.Image:
    rgb = np.asarray(src.convert('RGB'))
    corners = [rgb[0, 0], rgb[0, -1], rgb[-1, 0], rgb[-1, -1]]
    if max(int(c.max()) for c in corners) > 28:
        notes.append('Hintergrund in den Ecken nicht schwarz: bitte neu erzeugen')
    bg = background_mask(rgb, 0.085)
    if bg.mean() < 0.15:
        notes.append('kaum schwarzer Hintergrund gefunden: Motiv füllt das Bild oder Hintergrund ist nicht schwarz')
    # Inside the backdrop, what is left of a glow is light added to black. It becomes the pure colour of
    # the glow with an opacity equal to its brightness, which looks the same on black and right on any
    # other dark surface. Anything dimmer than `floor` is sensor noise and goes.
    floor = 6.0
    v = rgb.max(axis=2).astype(np.float32)
    fade = np.clip((v - floor) / (255.0 - floor), 0, 1)
    alpha = np.where(bg, fade, 1.0)
    lift = np.where(bg, 255.0 / np.maximum(v, 1.0), 1.0)[..., None]
    colour = np.clip(rgb.astype(np.float32) * lift, 0, 255).astype(np.uint8)
    out = Image.fromarray(colour, 'RGB').convert('RGBA')
    out.putalpha(Image.fromarray((alpha * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(0.7)))
    out = square_trim(out)
    return out.resize((size, size), Image.LANCZOS)


def treat_mask(src: Image.Image, size: int, notes: list) -> Image.Image:
    lum = src.convert('L')
    arr = np.asarray(lum).astype(np.float32) / 255
    mid = ((arr > 0.25) & (arr < 0.75)).mean()
    if mid > 0.08:
        notes.append('viele Graustufen: Emblem ist nicht rein schwarz-weiss')
    alpha = Image.fromarray((np.clip((arr - 0.12) / 0.6, 0, 1) * 255).astype(np.uint8), 'L')
    out = Image.new('RGBA', src.size, (255, 255, 255, 0))
    out.putalpha(alpha)
    out = square_trim(out, pad=0.04)
    return out.resize((size, size), Image.LANCZOS)


def treat_cover(src: Image.Image, w: int, h: int, notes: list) -> Image.Image:
    img = src.convert('RGB')
    want = w / h
    have = img.width / img.height
    # Banners arrive as 16:9 and are cut to their strip on purpose: only odd shapes are worth a note.
    if abs(have - want) / want > 0.12 and not (w / h >= 2 and have > 1.5):
        notes.append(f'Seitenverhältnis {img.width}x{img.height} weicht ab, wird beschnitten')
    if img.width < w * 0.8 or img.height < h * 0.8:
        notes.append(f'klein ({img.width}x{img.height}), wird hochskaliert')
    if have > want:
        nw = round(img.height * want)
        x = (img.width - nw) // 2
        img = img.crop((x, 0, x + nw, img.height))
    else:
        nh = round(img.width / want)
        # Portraits keep their top: faces sit in the upper part.
        y = round((img.height - nh) * (0.2 if h > w else 0.5))
        img = img.crop((0, y, img.width, y + nh))
    return img.resize((w, h), Image.LANCZOS)


def run(inbox: Path, only: list) -> int:
    problems = 0
    for group, rules in GROUPS.items():
        if only and group not in only:
            continue
        folder = inbox / group
        if not folder.is_dir():
            continue
        files = sorted(p for p in folder.iterdir() if p.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp'))
        if not files:
            continue
        print(f'\n{group}')
        expected = set()
        for names, _, _ in rules:
            expected |= set(names or [])
        seen = set()
        for path in files:
            name = path.stem.lower()
            if f'{group}/{name}' in HELD:
                print(f'  -  {path.name}: zurückgehalten. {HELD[f"{group}/{name}"]}')
                continue
            rule = next(((n, t, s) for n, t, s in rules if n is None or name in n), None)
            if rule is None:
                print(f'  ?  {path.name}: unbekannter Dateiname, übersprungen')
                problems += 1
                continue
            _, treatment, settings = rule
            notes: list = []
            src = Image.open(path)
            if treatment == 'key':
                out = treat_key(src, settings['size'], notes)
            elif treatment == 'mask':
                out = treat_mask(src, settings['size'], notes)
            else:
                out = treat_cover(src, settings['w'], settings['h'], notes)
            if 'out' in settings:
                target = ROOT / settings['out'] / settings['name']
                target.parent.mkdir(parents=True, exist_ok=True)
                out.save(target)
            else:
                target = OUT / group / f'{name}.webp'
                target.parent.mkdir(parents=True, exist_ok=True)
                out.save(target, 'WEBP', quality=84 if treatment == 'cover' else 90, method=6)
            seen.add(name)
            mark = '!' if notes else 'ok'
            print(f'  {mark:2} {path.name} -> {target.relative_to(ROOT)} ({out.width}x{out.height}, {target.stat().st_size // 1024} kB)' + ''.join(f'\n       {n}' for n in notes))
            problems += len(notes)
        missing = sorted(expected - seen - {p.stem for p in (OUT / group).glob('*.webp')} if (OUT / group).is_dir() else expected - seen)
        if missing:
            print(f'  noch offen: {", ".join(missing)}')
    return problems


if __name__ == '__main__':
    args = sys.argv[1:]
    inbox = ROOT / 'art-inbox'
    if '--inbox' in args:
        i = args.index('--inbox')
        inbox = Path(args[i + 1]).resolve()
        del args[i:i + 2]
    count = run(inbox, args)
    print(f'\n{count} Hinweise' if count else '\nalles in Ordnung')
