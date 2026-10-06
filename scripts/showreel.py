# along — 30 s showreel. Renders every frame with PIL + numpy (4-sample motion blur), synthesises the score + SFX with numpy.
# Usage (from repo root, with numpy + pillow): python scripts/showreel.py still 0.5 3.2 ...  |  video out.mp4  |  audio out.wav
import sys, math, random, os, subprocess
from functools import lru_cache
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..")) if os.path.basename(os.path.dirname(os.path.abspath(__file__))) == "scripts" else "/Users/pmjpraveen/Desktop/ALONG"
FD = os.path.expanduser("~/Library/Fonts")
W, H, FPS = 1920, 1280, 30
BPM = 128; BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = 30.0
# latest brand (DESIGN.md "Current styling"): Brand Black on white, the six trip-card colours, the splash stripes
BLK = (34, 34, 34); WHITE = (255, 255, 255); GREY = (106, 106, 106); ICON = (68, 68, 68); SOFT = (244, 244, 244); LINE = (208, 208, 208); RED = (203, 39, 47)
PEACH = (255, 192, 145); PERI = (229, 235, 255); BEIGE = (235, 224, 217); OLIVE = (217, 224, 171); SKY = (222, 246, 255); LEMON = (255, 242, 123)
STRIPES = [(255, 204, 61), (255, 173, 0), (255, 75, 0), (222, 0, 90), (111, 0, 177), (0, 35, 133)]  # app splash stripes

# scene boundaries (seconds) — all on bar lines
T_VAC, T_DROP, T_PLAN, T_SPLIT, T_EXACT, T_SETTLE, T_STAMP, T_MONT, T_FIN = 3.40, 3.75, 5.625, 9.375, 13.125, 16.875, 20.625, 24.375, 26.25

# ---------- easing ----------
def clamp(x, a=0.0, b=1.0): return a if x < a else b if x > b else x
def prog(t, t0, d): return clamp((t - t0) / d)
def oexpo(x): return 1.0 if x >= 1 else 1 - 2 ** (-10 * x)
def ocubic(x): return 1 - (1 - x) ** 3
def icubic(x): return x ** 3
def iocubic(x): return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2
def oback(x, s=1.9): x = clamp(x) - 1; return 1 + (s + 1) * x ** 3 + s * x ** 2
def spring(x, f=1.6, z=6.5): return 1.0 if x >= 1 else 1 - math.exp(-z * x) * math.cos(2 * math.pi * f * x)
def lerp(a, b, x): return a + (b - a) * x
def hsh(n): return (math.sin(n * 127.1 + 311.7) * 43758.5453) % 1.0
def beat_t(n): return n * BEAT

# ---------- sprites ----------
def col(c, a=255): return tuple(c) + (a,) if len(c) == 3 else tuple(c)

@lru_cache(None)
def tsp(txt, w, size, fill, ls=0.0):
    f = font(w, size); pad = 12
    adv = [f.getlength(ch) + ls * size for ch in txt] if ls else [f.getlength(txt)]
    wd = int(sum(adv)) + pad * 2; ht = int(size * 1.4) + pad
    m = Image.new("L", (wd, ht), 0); d = ImageDraw.Draw(m)
    if ls:
        x = pad
        for ch, a in zip(txt, adv): d.text((x, size * 1.05), ch, font=f, fill=255, anchor="ls"); x += a
    else: d.text((pad, size * 1.05), txt, font=f, fill=255, anchor="ls")
    im = Image.new("RGBA", m.size, col(fill)); im.putalpha(m); return im

@lru_cache(None)
def rr(w, h, r, fill, outline=None, ow=0, dash=0):
    k = 2; im = Image.new("RGBA", (w * k, h * k), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, w * k - 1, h * k - 1], r * k, fill=col(fill) if fill else None, outline=col(outline) if outline else None, width=ow * k)
    return im.resize((w, h), Image.LANCZOS)

@lru_cache(None)
def avatar(letter, d, guest=False, fill=SOFT, ink=ICON, ring=None):
    k = 3; im = Image.new("RGBA", (d * k, d * k), (0, 0, 0, 0)); dr = ImageDraw.Draw(im)
    dr.ellipse([0, 0, d * k - 1, d * k - 1], fill=col(fill))
    if guest:
        n = 22
        for i in range(n):
            a0 = i * 360 / n; dr.arc([4, 4, d * k - 5, d * k - 5], a0, a0 + 360 / n * .55, fill=col(ring or GREY), width=int(d * k * .035))
    im = im.resize((d, d), Image.LANCZOS); t = tsp(letter, 500, int(d * .42), ink)
    im.alpha_composite(t, ((d - t.width) // 2, int(d * .5 - t.height * .5)))
    return im

def shadow_of(spr, blur=34, op=.28):
    a = spr.getchannel("A").point(lambda v: int(v * op)); pad = blur * 3
    big = Image.new("L", (spr.width + pad * 2, spr.height + pad * 2), 0); big.paste(a, (pad, pad))
    big = big.filter(ImageFilter.GaussianBlur(blur)); s = Image.new("RGBA", big.size, (0, 0, 0, 255)); s.putalpha(big); return s
_SH = {}
def shadow(key, spr, blur=34, op=.28):
    k = (key, blur, op)
    if k not in _SH: _SH[k] = shadow_of(spr, blur, op)
    return _SH[k]

def place(cv, spr, cx, cy, s=1.0, rot=0.0, a=1.0, sx=1.0, sy=1.0):
    if a <= 0.003 or s <= 0: return
    w, h = spr.size; nw, nh = max(1, int(w * s * sx)), max(1, int(h * s * sy))
    if (nw, nh) != (w, h): spr = spr.resize((nw, nh), Image.BILINEAR if max(nw, nh) < 1.6 * max(w, h) else Image.BICUBIC)
    if rot: spr = spr.rotate(rot, resample=Image.BICUBIC, expand=True)
    x, y = int(cx - spr.width / 2), int(cy - spr.height / 2)
    if x > W or y > H or x + spr.width < 0 or y + spr.height < 0: return
    if a < 0.997:
        spr = spr.copy(); spr.putalpha(ImageChops.multiply(spr.getchannel("A"), Image.new("L", spr.size, int(255 * a))))
    cv.paste(spr, (x, y), spr)

def placeS(cv, spr, key, cx, cy, s=1.0, rot=0.0, a=1.0, lift=26, blur=34, op=.28, sx=1.0, sy=1.0):
    sh = shadow(key, spr, blur, op); place(cv, sh, cx, cy + lift * s, s, rot, a, sx, sy); place(cv, spr, cx, cy, s, rot, a, sx, sy)

def persp(spr, yaw=0.0, pitch=0.0, roll=0.0, dist=2600):
    w, h = spr.size; ya, pa, ra = map(math.radians, (yaw, pitch, roll))
    pts = []
    for x, y in [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]:
        x, z = x * math.cos(ya), -x * math.sin(ya)
        y, z2 = y * math.cos(pa) - z * math.sin(pa), y * math.sin(pa) + z * math.cos(pa)
        x, y = x * math.cos(ra) - y * math.sin(ra), x * math.sin(ra) + y * math.cos(ra)
        f = dist / (dist + z2); pts.append((x * f, y * f))
    mnx, mny = min(p[0] for p in pts), min(p[1] for p in pts)
    ow, oh = int(max(p[0] for p in pts) - mnx) + 2, int(max(p[1] for p in pts) - mny) + 2
    src = [(0, 0), (w, 0), (w, h), (0, h)]; A = []; B = []
    for (X, Y), (x, y) in zip([(p[0] - mnx, p[1] - mny) for p in pts], src):
        A.append([X, Y, 1, 0, 0, 0, -x * X, -x * Y]); A.append([0, 0, 0, X, Y, 1, -y * X, -y * Y]); B += [x, y]
    c = np.linalg.solve(np.array(A, float), np.array(B, float))
    return spr.transform((ow, oh), Image.PERSPECTIVE, tuple(c), Image.BICUBIC), mnx, mny

def place_persp(cv, spr, cx, cy, s=1.0, **kw):
    if s != 1.0: spr = spr.resize((int(spr.width * s), int(spr.height * s)), Image.BILINEAR)
    o, dx, dy = persp(spr, **kw); cv.paste(o, (int(cx + dx), int(cy + dy)), o)

@lru_cache(None)
def vgrad(c1, c2):
    t = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
    a = np.array(c1, np.float32)[None, None, :] * (1 - t) + np.array(c2, np.float32)[None, None, :] * t
    return Image.fromarray(np.repeat(a, W, 1).astype(np.uint8))
def bg(c1, c2=None): return (vgrad(c1, c2 or c1)).copy()
def tint(cv, c, a):
    if a > 0.003: cv.paste(Image.new("RGB", cv.size, c), (0, 0), Image.new("L", cv.size, int(255 * clamp(a))))

@lru_cache(None)
def fit(txt, w, maxw, ls=0.0):
    s = 400
    while s > 20:
        if sum(font(w, s).getlength(ch) + ls * s for ch in txt) <= maxw: return s
        s -= 4
    return s

def kin(cv, txt, w, size, cx, cy, t, t0, step, fill, ls=-0.02, rise=.7, rot=9):
    f = font(w, size); adv = [f.getlength(ch) + ls * size for ch in txt]; x = cx - sum(adv) / 2
    for i, ch in enumerate(txt):
        if ch != " ":
            p = prog(t, t0 + i * step, .42); e = oback(p, 2.2)
            if p > 0:
                sp = tsp(ch, w, size, fill); place(cv, sp, x + adv[i] / 2, cy + (1 - e) * size * rise, 1, (1 - e) * rot * (1 if i % 2 else -1), clamp(p * 5))
        x += adv[i]

def pop(cv, spr, cx, cy, t, t0, d=.45, **kw):
    p = prog(t, t0, d)
    if p > 0: place(cv, spr, cx, cy, spring(p) * kw.pop("s", 1.0), a=clamp(p * 6), **kw)

def title(cv, t, text, sub, c, sc, t0=0.05, y=320, step=.04, maxw=940, w=900, cx=None):
    cx = cx or W / 2; sz = fit(text, w, maxw, -0.03); kin(cv, text, w, sz, cx, y, t, t0, step, c, ls=-0.03)
    if sub:
        p = prog(t, t0 + len(text) * step + .1, .4)
        if p > 0: s = tsp(sub, 300, 54, sc); place(cv, s, cx, y + sz * .62 + (1 - ocubic(p)) * 30, a=p)

def ring_mask(cv, cx, cy, r, wd, c, a=1.0):
    if r <= 0 or a <= 0: return
    ov = Image.new("RGBA", (int(2 * r + wd * 2 + 4),) * 2, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    d.ellipse([wd + 2, wd + 2, 2 * r + wd + 2, 2 * r + wd + 2], outline=col(c, int(255 * a)), width=max(1, int(wd)))
    cv.paste(ov, (int(cx - r - wd - 2), int(cy - r - wd - 2)), ov)

def particles(cv, seed, n, t, t0, org, vmin, vmax, g, life, colors, size=(14, 30), spread=(0, 360), shapes="rc"):
    tau = t - t0
    if tau < 0 or tau > life: return
    d = ImageDraw.Draw(cv); rnd = random.Random(seed)
    for i in range(n):
        ang = math.radians(rnd.uniform(*spread)); v = rnd.uniform(vmin, vmax); c = colors[rnd.randrange(len(colors))]
        sz = rnd.uniform(*size); sh = shapes[rnd.randrange(len(shapes))]; spin = rnd.uniform(-9, 9); ph = rnd.uniform(0, 6)
        dec = math.exp(-1.6 * tau)
        x = org[0] + math.cos(ang) * v * (1 - dec) / 1.6; y = org[1] + math.sin(ang) * v * (1 - dec) / 1.6 + .5 * g * tau * tau
        al = 1 - prog(tau, life * .6, life * .4); sz *= al
        if sz < 1: continue
        if sh == "c": d.ellipse([x - sz / 2, y - sz / 2, x + sz / 2, y + sz / 2], fill=c)
        else:
            a = spin * tau + ph; w2, h2 = sz, sz * .5 * (abs(math.cos(a * 1.7)) + .15)
            pts = [(x + math.cos(a) * dx - math.sin(a) * dy, y + math.sin(a) * dx + math.cos(a) * dy) for dx, dy in [(-w2 / 2, -h2 / 2), (w2 / 2, -h2 / 2), (w2 / 2, h2 / 2), (-w2 / 2, h2 / 2)]]
            d.polygon(pts, fill=c)

# ---------- brand assets ----------
@lru_cache(None)
def wordmark(c, width):
    im = Image.open(f"{ROOT}/assets/images/icon.png").convert("RGB"); r = np.asarray(im, np.float32)[..., 0]
    a = np.clip((r - 34) / (255 - 34), 0, 1); m = Image.fromarray((a * 255).astype(np.uint8)); m = m.crop(m.getbbox())
    m = m.resize((width, int(m.height * width / m.width)), Image.LANCZOS); s = Image.new("RGBA", m.size, col(c)); s.putalpha(m); return s

@lru_cache(None)
def raw(name): return Image.open(f"{ROOT}/store/raw/{name}.png").convert("RGB")
PW, BEZ = 720, 16
def phone(scr, key):
    sw = PW; sh = int(scr.height * sw / scr.width); s = scr.resize((sw, sh), Image.LANCZOS); R = 96
    out = Image.new("RGBA", (sw + 2 * BEZ, sh + 2 * BEZ), (0, 0, 0, 0)); out.alpha_composite(rr(sw + 2 * BEZ, sh + 2 * BEZ, R + BEZ, (11, 11, 11), (70, 70, 70), 4))
    m = rr(sw, sh, R, (255, 255, 255)).getchannel("A"); out.paste(s, (BEZ, BEZ), m)
    ImageDraw.Draw(out).rounded_rectangle([out.width / 2 - 95, BEZ + 24, out.width / 2 + 95, BEZ + 74], 25, fill=(5, 5, 5)); return out
@lru_cache(None)
def phone_static(name): return phone(base(name), name)
RS = PW / 1206.0   # raw px -> phone px

# stamps drawn below (explicit builder to keep arcs readable)
def arc_text(im, txt, cx, cy, r, mid_deg, w, size, c, ls=0.12, flip=False):
    f = font(w, size); adv = [f.getlength(ch) + ls * size for ch in txt]; tot = sum(adv); span = tot / r
    a = math.radians(mid_deg) + (span / 2 if not flip else -span / 2)
    for ch, ad in zip(txt, adv):
        step = ad / r; a -= step / 2 * (1 if not flip else -1)
        x, y = cx + math.cos(a) * r, cy - math.sin(a) * r
        sp = tsp(ch, w, size, c); rot = math.degrees(a) - 90 if not flip else math.degrees(a) + 90
        sp = sp.rotate(rot, resample=Image.BICUBIC, expand=True); im.alpha_composite(sp, (int(x - sp.width / 2), int(y - sp.height / 2)))
        a -= step / 2 * (1 if not flip else -1)

def distress(im, seed, amt=.1):
    rnd = np.random.RandomState(seed); n = rnd.rand(im.height // 3 + 1, im.width // 3 + 1)
    n = np.asarray(Image.fromarray((n * 255).astype(np.uint8)).resize(im.size, Image.BICUBIC), np.float32) / 255
    keep = (n > 1 - amt * 1.6).astype(np.float32) * -1 + 1; keep = np.clip(keep + .15, 0, 1)
    a = np.asarray(im.getchannel("A"), np.float32) * keep; out = im.copy(); out.putalpha(Image.fromarray(a.astype(np.uint8))); return out

@lru_cache(None)
def stamp(kind):
    if kind in ("dep", "ooty", "ring"):
        S = 560; k = 1; im = Image.new("RGBA", (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        c = {"dep": (138, 42, 134), "ooty": BLK, "ring": BLK}[kind]; cc = col(c)
        d.ellipse([6, 6, S - 7, S - 7], outline=cc, width=12)
        for i in range(36):
            d.arc([48, 48, S - 49, S - 49], i * 10, i * 10 + 6, fill=cc, width=5)
        top, mid, bot = {"dep": ("DEPARTURE", "PURI, INDIA", "16 DEC 2026"), "ooty": ("ALONG · TRAVEL STAMP", "KONARK", "14 DEC 2026"), "ring": ("TRIP COMPLETED", "PURI", "12 - 16 DEC")}[kind]
        arc_text(im, top, S / 2, S / 2, S * .385, 90, 800, 34, c, .22)
        arc_text(im, bot, S / 2, S / 2, S * .385, 270, 800, 32, c, .2, flip=True)
        t = tsp(mid, 900, fit(mid, 900, S * .6, -.01), c, -.01); im.alpha_composite(t, ((S - t.width) // 2, S // 2 - t.height // 2 + 6))
        d.ellipse([S / 2 - 9, 84 - 9 + 0, S / 2 + 9, 84 + 9], fill=cc) if kind == "ooty" else None
        return distress(im, 3 + len(kind))
    S = (620, 400); im = Image.new("RGBA", S, (0, 0, 0, 0)); d = ImageDraw.Draw(im); c = (42, 61, 154); cc = col(c)
    d.rounded_rectangle([4, 4, S[0] - 5, S[1] - 5], 34, outline=cc, width=7)
    n = 40
    for i in range(0, 620, 22): d.line([(i, 4), (i + 12, 4)], fill=cc, width=9); d.line([(i, S[1] - 6), (i + 12, S[1] - 6)], fill=cc, width=9)
    d.rounded_rectangle([34, 34, S[0] - 35, S[1] - 35], 20, outline=cc, width=3)
    a = tsp("ARRIVAL", 800, 34, c, .3); im.alpha_composite(a, ((S[0] - a.width) // 2, 56)); d.ellipse([S[0] / 2 - 8, 36, S[0] / 2 + 8, 52], fill=cc)
    t = tsp("PURI, INDIA", 900, fit("PURI, INDIA", 900, 480, -.01), c, -.01); im.alpha_composite(t, ((S[0] - t.width) // 2, 130))
    t = tsp("12 DEC 2026", 800, 38, c, .15); im.alpha_composite(t, ((S[0] - t.width) // 2, 270))
    return distress(im, 11)

# ---------- the app's own screens, re-texted with the Puri trip (the screenshots are only edited where the text differs) ----------
AFONTS = {"L": "GeistSans-Light.ttf", "R": "GeistSans-Regular.ttf", "M": "GeistSans-Medium.ttf"}
@lru_cache(None)
def af(k, s): return ImageFont.truetype(f"{ROOT}/assets/fonts/{AFONTS[k]}", int(s))
def font(w, s): return af("L" if w <= 300 else "R" if w <= 400 else "M", s)   # the whole film is Geist Sans Light / Regular / Medium

def _bbox(im, reg, bgc, th=45):
    a = np.asarray(im.crop(reg), np.int16); m = np.abs(a - np.array(bgc, np.int16)).sum(2) > th; ys, xs = np.where(m)
    return None if not len(xs) else (reg[0] + int(xs.min()), reg[1] + int(ys.min()), reg[0] + int(xs.max()) + 1, reg[1] + int(ys.max()) + 1)

def retext(im, reg, orig, new, k, fill, align="l", bgc=None, dy=0, bgpt=None):
    bgc = bgc or im.getpixel(bgpt or (reg[0] + 3, reg[1] + 3)); bb = _bbox(im, reg, bgc)
    if bb is None: return
    size = 100 * (bb[2] - bb[0]) / af(k, 100).getlength(orig); d = ImageDraw.Draw(im); d.rectangle([bb[0] - 4, bb[1] - 4, bb[2] + 4, bb[3] + 4], fill=bgc)
    x = {"l": bb[0], "c": (bb[0] + bb[2]) / 2, "r": bb[2]}[align]; y = (bb[1] + bb[3]) / 2 + dy
    d.text((x, y), new, font=af(k, size), fill=fill, anchor={"l": "lm", "c": "mm", "r": "rm"}[align])

def tag_sprite(text, size):
    f = af("M", size); w = int(f.getlength(text) + size * 1.55); h = int(size * 1.85); sp = rr(w, h, int(size * .5), BLK).copy()
    ImageDraw.Draw(sp).text((w / 2, h / 2 - size * .02), text, font=f, fill=WHITE, anchor="mm"); return sp.rotate(2.6, resample=Image.BICUBIC, expand=True)

TRIP, PLACE, DATES = "Puri trip", "Puri, Odisha", "12 Dec - 16 Dec"
@lru_cache(None)
def tag_size(): return int(100 * 418 / af("M", 100).getlength("Goa with the gang"))

def put_tag(im, reg, text):
    bgc = im.getpixel((reg[0] + 3, reg[1] + 3)); bb = _bbox(im, reg, bgc); ImageDraw.Draw(im).rectangle([bb[0] - 4, bb[1] - 4, bb[2] + 4, bb[3] + 4], fill=bgc)
    sp = tag_sprite(text, tag_size()); im.paste(sp, (int((bb[0] + bb[2]) / 2 - sp.width / 2), int((bb[1] + bb[3]) / 2 - sp.height / 2)), sp)

EXPENSE_ROWS = [("Flights · 5 people", "Paid by Praveen", "₹71,130.00"), ("Flights · 4 people", "Paid by Hemant", "₹67,280.00"), ("Flights · 3 people", "Paid by Shiva", "₹55,157.00")]
ROW_Y = [(1652, 1725, 1685), (1893, 1969, 1930), (2135, 2210, 2171)]
ROW_ORIG = [("Scooter rental", "Added by You", "₹1,201.00"), ("Dinner at the shack", "Owed to Cy", "₹2,400.00"), ("Hotel", "Paid by You", "₹20,000.00")]
def patch_rows(im, rows):
    for (nm, sub, amt), (yn, ys, ya), (on, os_, oa) in zip(rows, ROW_Y, ROW_ORIG):
        retext(im, (225, yn - 36, 800, yn + 36), on, nm, "R", BLK); retext(im, (225, ys - 30, 800, ys + 30), os_, sub, "R", GREY)
        retext(im, (760, ya - 34, 1150, ya + 34), oa, amt, "R", BLK, "r")
@lru_cache(None)
def expense_rows_img(key):
    im = raw("3-expenses").copy(); patch_rows(im, key); return im

@lru_cache(None)
def base(name):
    im = raw(name).copy(); d = ImageDraw.Draw(im)
    if name == "1-home":
        retext(im, (205, 1128, 440, 1172), "25 Sep - 2 Oct", DATES, "R", GREY, "c", bgpt=(192, 1150)); put_tag(im, (70, 1190, 580, 1310), TRIP); retext(im, (200, 1325, 440, 1372), "Goa, India", PLACE, "R", BLK, "c")
    elif name == "5-day2":
        retext(im, (500, 775, 705, 810), "25 Sep - 2 Oct", DATES, "R", BLK, "c", bgpt=(484, 792)); put_tag(im, (340, 835, 870, 950), TRIP); retext(im, (390, 975, 820, 1035), "3 activities · 8 days", "3 activities · 5 days", "R", GREY, "c")
        for (cx, ch) in zip([413, 540, 663, 790], "AGPH"):
            c = im.getpixel((cx - 38, 1140)); d.ellipse([cx - 50, 1140 - 50, cx + 50, 1140 + 50], fill=c); d.text((cx, 1140), ch, font=af("R", 72), fill=ICON, anchor="mm")
        retext(im, (330, 1665, 880, 1730), "Baga Beach", "Jagannath Temple", "M", BLK); retext(im, (395, 1760, 900, 1820), "Baga Beach, Goa", "Grand Road, Puri", "R", GREY)
        retext(im, (330, 1985, 880, 2050), "Fish curry lunch", "Konark Sun Temple", "M", BLK); retext(im, (395, 2080, 900, 2140), "Fisherman's Wharf", "Konark, Odisha", "R", GREY)
    elif name == "3-expenses":
        retext(im, (210, 640, 640, 700), "Trip to Goa, India", "Trip to Puri, Odisha", "M", BLK)
        bb = _bbox(im, (120, 905, 820, 1010), (255, 255, 255)); sz = 100 * (bb[2] - bb[0]) / (af("M", 100).getlength("₹ 23,601") + af("R", 100).getlength(".00")); d.rectangle([bb[0] - 4, bb[1] - 6, bb[2] + 4, bb[3] + 6], fill=WHITE)
        a = "₹ 199,567"; d.text((bb[0], (bb[1] + bb[3]) / 2), a, font=af("M", sz), fill=BLK, anchor="lm"); d.text((bb[0] + af("M", sz).getlength(a), (bb[1] + bb[3]) / 2), ".00", font=af("R", sz), fill=GREY, anchor="lm")
        retext(im, (125, 1065, 760, 1115), "You're owed ₹14,200.00", "You owe ₹14,226.00", "R", GREY)
        for cx, ch in zip([196, 305, 413, 522], "AGPH"):
            c = im.getpixel((cx - 34, 1212)); d.ellipse([cx - 40, 1212 - 40, cx + 40, 1212 + 40], fill=c); d.text((cx, 1212), ch, font=af("R", 50), fill=ICON, anchor="mm")
        patch_rows(im, EXPENSE_ROWS)
    elif name == "7-balances":
        retext(im, (110, 770, 950, 890), "You owe ₹4,500.00", "You owe ₹14,226.00", "M", BLK); retext(im, (225, 1240, 880, 1300), "You owe Ben ₹4,500.00", "You owe Praveen ₹14,226.00", "R", BLK)
        retext(im, (225, 1672, 1000, 1735), "Ben is owed ₹4,500.00", "Praveen is owed ₹56,904.00", "R", BLK); retext(im, (85, 1660, 170, 1750), "B", "P", "R", ICON, "c")
    elif name == "8-stamps":
        d.rectangle([60, 700, 1160, 1020], fill=WHITE)
        for kind, cx, cy, w in [("dep", 322, 872, 420), ("arr", 880, 868, 480)]:
            sp = stamp(kind); sp = sp.resize((w, int(sp.height * w / sp.width)), Image.LANCZOS); im.paste(sp, (cx - sp.width // 2, cy - sp.height // 2), sp)
    return im

# ---------- scenes (landscape, latest neutral brand: Brand Black on white, six trip-card colours, splash stripes) ----------
CHAT = [("B", "who's booking the flights??"), ("A", "I paid for ours. again."), ("C", "what's the plan for day 2?"), ("B", "u owe me ₹14,226"), ("A", "GPay me pls"),
        ("C", "who's on Hemant's flight??"), ("B", "split it 4 ways?"), ("A", "no 3. Girija isn't coming"), ("C", "WHO HAS THE HOTEL LINK"), ("B", "how much was the boat ride"),
        ("A", "?????"), ("C", "I'll pay u later"), ("B", "hello??"), ("A", "wait"), ("C", "!!!"), ("B", "pls"), ("A", "??"), ("C", "huh"), ("B", "??"), ("A", "!!"), ("C", "??"), ("B", "!!!")]
def chaos_times():
    ts = []; t = .12; g = .33
    while t < 3.3: ts.append(t); t += g; g = max(.055, g * .87)
    return ts
CT = chaos_times()
CL, CR = 460, 1460   # chat column edges

@lru_cache(None)
def bubble(i):
    who, txt = CHAT[i % len(CHAT)]; me = who == "A"; sz = 50 if len(txt) < 22 else 44
    t = tsp(txt, 600, sz, BLK); w = t.width + 76; h = int(sz * 1.35) + 56
    b = rr(w, h, min(h // 2, 52), PEACH if me else SOFT); b.alpha_composite(t, (38, (h - t.height) // 2 + 4)); return b, who, me

@lru_cache(None)
def side_toast(i):
    who, txt = CHAT[i % len(CHAT)]; t = tsp(txt[:15], 600, 32, BLK); w = t.width + 130
    b = rr(w, 96, 48, WHITE); b.alpha_composite(avatar(who, 64), (18, 16)); b.alpha_composite(t, (96, 30)); return b

@lru_cache(None)
def glow_img(c):
    y, x = np.mgrid[0:H, 0:W].astype(np.float32); r = np.sqrt(((x - W / 2) / W) ** 2 + ((y - H * .6) / H) ** 2) * 2
    return np.clip(1 - r, 0, 1) ** 2

def sc_chaos(t):
    n = sum(1 for x in CT if x <= t); k = clamp(t / 3.3)
    cv = bg((26, 26, 26), BLK); arr = np.asarray(cv, np.float32); arr = arr + (glow_img(0) * (.08 + .5 * k * k))[..., None] * np.array(PEACH, np.float32) * .30
    cv = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    num = str(min(99, n * 5)) + ("+" if n * 5 >= 99 else ""); place(cv, tsp(num, 900, 800, (48, 48, 48), -.04), W / 2, 650 + 14 * math.sin(t * 6), 1.0 + .08 * k)
    place(cv, rr(W, 130, 0, (20, 20, 20)), W / 2, 65); place(cv, avatar("G", 84, False, PEACH, BLK), CL + 50, 66)
    place(cv, tsp("Puri gang", 700, 46, WHITE), CL + 245, 52); place(cv, tsp("typing…", 400, 30, (150, 150, 150)), CL + 215, 98)
    bp = 1 + .18 * math.sin(t * 22) * k; place(cv, rr(120, 74, 37, RED), CR - 70, 66, bp); place(cv, tsp(num, 800, 42, WHITE), CR - 70, 66, bp)
    for j in range(4, n):   # notifications piling in at the sides
        p = prog(t, CT[j], .3); side = j % 2; x = (190 + hsh(j + 3) * 250) if side == 0 else (W - 190 - hsh(j + 3) * 250); y = 190 + hsh(j + 11) * 880
        place(cv, side_toast(j), x, y, spring(p, 1.4, 7), (hsh(j + 5) - .5) * 12, clamp(p * 5) * .96)
    hs = [bubble(i)[0].height + 26 for i in range(n)]; base = 1160
    for j in range(n):
        b, who, me = bubble(j); push = sum(hs[m] * ocubic(prog(t, CT[m], .16)) for m in range(j + 1, n)); y = base - push - hs[j] / 2
        p = prog(t, CT[j], .3); s = spring(p, 1.4, 7); jx = (hsh(j) - .5) * 40 * k
        x = (CR - b.width / 2 - 90 + jx) if me else (CL + b.width / 2 + 90 + jx); xa = (CR - 40 + jx) if me else (CL + 40 + jx)
        if y < 40: continue
        place(cv, b, x, y, s, (hsh(j + 9) - .5) * 5 * k * 2, clamp(p * 5)); place(cv, avatar(who, 76), xa, y + b.height * .1, s, 0, clamp(p * 5))
    for i in range(3): d = .5 + .5 * math.sin(t * 14 - i * 1.1); place(cv, rr(20, 20, 10, (150, 150, 150)), CL + 120 + i * 34, 1235 - d * 10, 1, 0, .9)
    return cv

def glitch(cv, amt, seed):
    if amt <= .01: return cv
    r = random.Random(seed); out = cv.copy(); y = 0
    while y < H:
        h = r.randint(14, 100)
        if r.random() < amt: dx = int(r.uniform(-1, 1) * 200 * amt); out.paste(cv.crop((0, y, W, y + h)).transform((W, h), Image.AFFINE, (1, 0, -dx, 0, 1, 0)), (0, y))
        y += h
    return out

def sc_vac(t):
    tau = t - T_VAC; cv = Image.new("RGB", (W, H), (6, 6, 6)); p = prog(tau, .06, .29); r = 8 + 14 * p
    ring_mask(cv, W / 2, H / 2, 26 * p ** 2 * 3 + 6, 3, WHITE, .35 * p); ImageDraw.Draw(cv).ellipse([W / 2 - r, H / 2 - r, W / 2 + r, H / 2 + r], fill=WHITE); return cv

def sc_drop(t):
    tau = t - T_DROP; cv = bg(BLK); CY = 520
    for d0, a in [(0, .35), (.07, .22), (.14, .12)]:
        p = prog(tau, d0, 1.0); ring_mask(cv, W / 2, CY, 2300 * ocubic(p), 30 * (1 - p) + 2, WHITE, a * (1 - p))
    wm = wordmark(WHITE, 1040); p = prog(tau, 0, .5); s = lerp(3.0, 1.0, oback(prog(tau, 0, .42), 1.6)); sy = 1 + .22 * (1 - prog(tau, 0, .3)) ** 2
    pulse = 1 + .04 * math.exp(-((tau - BEAT) % BEAT) / .09) if tau > .3 else 1
    place(cv, wm, W / 2, CY, s * pulse, 0, clamp(p * 5), sy=sy, sx=1 / sy ** .5)
    words = ["Group trips,", "finally", "together."]; pw = [tsp(w2, 300, 62, WHITE).width for w2 in words]; tot = sum(pw) + 18 * 2
    for i, wd in enumerate(words):
        q = prog(tau, .55 + i * .16, .35)
        if q > 0: place(cv, tsp(wd, 300, 62, WHITE), W / 2 - tot / 2 + sum(pw[:i]) + 18 * i + pw[i] / 2, 850 + (1 - ocubic(q)) * 46, 1, 0, q)
    for i, c in enumerate(STRIPES):   # the splash stripes, under the lockup
        q = prog(tau, .95 + i * .05, .3)
        if q > 0: place(cv, rr(130, 18, 9, c), W / 2 - 3 * 140 + 70 + i * 140, 960, spring(q), 0, clamp(q * 5))
    particles(cv, 7, 70, t, T_DROP + .02, (W / 2, CY), 700, 1700, 1300, 1.3, STRIPES + [WHITE, PEACH], (14, 34))
    tint(cv, WHITE, 1 - prog(tau, 0, .32)); return cv

def screen_patch(name, f):
    im = base(name).copy(); d = ImageDraw.Draw(im); f(d, im); return im

PCX = 1440   # phone column centre
def sc_plan(t):
    tau = t - T_PLAN; cv = bg(PEACH)
    for i, r in enumerate([380, 640, 900]): ring_mask(cv, PCX, 700, r + 14 * math.sin(t * 1.5 + i), 3, BLK, .07)
    title(cv, t, "PLAN", "every day, together", BLK, ICON, T_PLAN + .05, y=270, maxw=820, cx=560)
    sp = spring(prog(tau, .1, .85), 1.3, 6); e = ocubic(prog(tau, .1, .95)); S = .78
    cx = PCX + (1 - sp) * 1000; cy = 772 + 6 * math.sin(tau * 2.2) * prog(tau, .9, .5)
    def patch(d, im):
        for (x0, y0, x1, y1), tt in [((290, 1600, 1146, 1870), 1.15), ((290, 1920, 1146, 2186), 1.55)]:
            if tau > tt: d.rectangle([x0 - 4, y0 - 4, x1 + 4, y1 + 4], fill=(255, 255, 255))
    ph = phone(screen_patch("5-day2", patch), "p"); place_persp(cv, ph, cx, cy, S, yaw=lerp(-30, 0, e), pitch=lerp(14, 0, e))
    def to_screen(x, y): return cx + (BEZ + x * RS - ph.width / 2) * S, cy + (BEZ + y * RS - ph.height / 2) * S
    for k, ((x0, y0, x1, y1), tt, dest, rot, name) in enumerate([((290, 1600, 1146, 1870), 1.15, (560, 660), -4, "baga"), ((290, 1920, 1146, 2186), 1.55, (620, 890), 3, "fish")]):
        q = prog(tau, tt, .55)
        if q <= 0: continue
        card = base("5-day2").crop((x0, y0, x1, y1)); card = card.copy(); card.putalpha(rr(card.width, card.height, 70, WHITE).getchannel("A"))
        ex = spring(q, 1.2, 6); sx, sy_ = to_screen((x0 + x1) / 2, (y0 + y1) / 2); dr = clamp((tau - 1.9) / .5)
        placeS(cv, card, "card" + name, lerp(sx, dest[0], ex) + 10 * math.sin(tau * 2.1 + k) * dr, lerp(sy_, dest[1], ex) + 8 * math.sin(tau * 1.7 + k * 2) * dr, lerp(RS * S, .85, ex), rot * ex, 1, lift=lerp(0, 36, ex), blur=36, op=lerp(0, .22, ex))
    for i, (tt, yy, nm, av, dark) in enumerate([(2.15, 1070, "Hemant added Jagannath Temple to the plan", "H", False), (2.8, 1200, "Lata added Konark Sun Temple · Day 3", "L", True)]):
        tp = prog(tau, tt, .5)
        if tp <= 0: continue
        t1 = rr(900, 120, 60, BLK if dark else WHITE); t1 = t1.copy(); t1.alpha_composite(avatar(av, 80, False, SOFT, ICON), (28, 20)); t1.alpha_composite(tsp(nm, 600, 38, WHITE if dark else BLK), (136, 34))
        x = lerp(-500, 560, oback(tp, 1.4)); place(cv, shadow("toast%d" % i, t1, 28, .2), x, yy + 22); place(cv, t1, x, yy)
    return cv

def sc_split(t):
    tau = t - T_SPLIT; cv = bg(PERI)
    for i, r in enumerate([380, 640, 900]): ring_mask(cv, PCX, 700, r, 3, BLK, .06)
    title(cv, t, "SPLIT", "who paid, who's in", BLK, ICON, T_SPLIT - .12, y=270, maxw=820, cx=560)
    ia = sum(1 for k in range(4) if tau > .72 + k * .14); amt = ("{:,}".format(int("6000"[:ia])) if ia else "0")
    idesc = int(clamp((tau - 1.4) / .045, 0, 17)); desc = "Chilika boat ride"[:idesc]; press = prog(tau, 2.344, .1) - prog(tau, 2.44, .12)
    def patch(d, im):
        d.rounded_rectangle([60, 684, 1146, 874], 40, fill=WHITE, outline=LINE, width=4)
        d.text((125, 780), "₹", font=font(400, 110), fill=BLK, anchor="lm"); d.text((230, 780), amt, font=font(400, 110), fill=BLK if ia else (150, 150, 150), anchor="lm")
        foc = 1.35 < tau < 2.3
        d.rounded_rectangle([60, 1028, 1146, 1170], 40, fill=WHITE, outline=BLK if foc else LINE, width=6 if foc else 4)
        d.text((120, 1100), desc if desc else "Lunch", font=font(400, 64), fill=BLK if desc else (150, 150, 150), anchor="lm")
        btn = BLK if ia >= 4 and idesc >= 17 else (242, 242, 242)
        d.rounded_rectangle([60, 2310, 1146, 2484], 87, fill=btn); d.text((603, 2397), "Add expense", font=font(500, 64), fill=WHITE if btn == BLK else BLK, anchor="mm")
    ph = phone(screen_patch("9-add-expense", patch), "e"); sp = spring(prog(tau, -.1, .8), 1.3, 6); out = ocubic(prog(tau, 2.55, .45)); e = ocubic(prog(tau, -.1, .9))
    cx = PCX + (1 - sp) * 1000; cy = 772 + out * 1000
    if cy < 2200: place_persp(cv, ph, cx, cy, .78 * (1 - .03 * press), yaw=lerp(-26, 0, e), pitch=lerp(12, 0, e) + out * 16)
    for i, (nm, y0, y1, tt, dy) in enumerate([("Scooter", 1598, 1818, 2.344 + .234, 640), ("Dinner", 1808, 2050, 2.344, 835), ("Hotel", 2050, 2290, 2.344 + .468, 1030)]):
        q = prog(tau, tt, .5)
        if q <= 0: continue
        row = expense_rows_img((("Chilika boat ride", "Added by You", "₹6,000.00"), EXPENSE_ROWS[0], EXPENSE_ROWS[1])).crop((60, y0, 1146, y1)); card = rr(1010, int(row.height * .88) + 40, 54, WHITE).copy(); card.paste(row.resize((int(row.width * .88), int(row.height * .88)), Image.LANCZOS), (12, 20))
        e2 = spring(q, 1.2, 6.5); placeS(cv, card, "row" + nm, 470, lerp(1500, dy, e2), .78, (1 - e2) * (3 if i % 2 else -3), 1, lift=26, blur=36, op=.2)
    tp = prog(tau, 3.28, .4)
    if tp > 0:
        place(cv, tsp("Total spent", 600, 46, ICON), 1380, 520, 1, 0, tp); place(cv, tsp("₹199,567", 900, 170, BLK, -.03), 1380, 680, spring(tp, 1.2, 7), 0, clamp(tp * 5))
        place(cv, tsp("Trip to Puri, Odisha", 400, 40, GREY), 1380, 800, 1, 0, tp)
    return cv

SHARES = {"Equally": [16820] * 4, "Custom amounts": [28000, 14280, 12500, 12500], "Percent": [26912, 20184, 13456, 6728], "Shares": [13456, 13456, 13456, 26912]}   # all sum to ₹67,280, Hemant's flight
ROWS_Y = [330, 500, 670, 840]; BAR_COL = [PEACH, LEMON, SKY, OLIVE]
def sc_exact(t):
    tau = t - T_EXACT; cv = bg(BLK)
    for i, r in enumerate([300, 560, 820]): ring_mask(cv, 500, 720, r, 3, WHITE, .06)
    title(cv, t, "EXACTLY.", "Hemant's flight · 4 people", WHITE, (190, 190, 190), T_EXACT + .05, y=300, maxw=760, cx=500)
    tabs = list(SHARES); sel = min(4, int((tau - .35) / BEAT)) if tau >= .35 else -1; si = sel % 4 if sel >= 0 else 0; pi = (sel - 1) % 4 if sel > 0 else 0
    sel_t = .35 + sel * BEAT if sel >= 0 else 0
    widths = [tsp(n, 500, 36, WHITE).width + 48 for n in tabs]; x = W / 2 - (sum(widths) + 14 * 3) / 2; centers = []
    for wd in widths: centers.append(x + wd / 2); x += wd + 14
    tp = prog(tau, .25, .4); hx = lerp(centers[pi], centers[si], spring(prog(tau, sel_t, .35), 1.1, 7)) if sel >= 0 else centers[0]
    hw = lerp(widths[pi], widths[si], ocubic(prog(tau, sel_t, .25))) if sel >= 0 else widths[0]
    for c, wd in zip(centers, widths): place(cv, rr(int(wd), 84, 42, (255, 255, 255, 30)), c, 100, 1, 0, tp)
    if sel >= 0: place(cv, rr(int(hw), 84, 42, WHITE), hx, 100, 1, 0, 1)
    for i, (c, n) in enumerate(zip(centers, tabs)): place(cv, tsp(n, 500, 36, BLK if (i == si and sel >= 0) else WHITE), c, 96, 1, 0, tp)
    ap = prog(tau, .2, .5)
    if ap > 0: place(cv, tsp("₹67,280", 900, 200, WHITE, -.03), 490, 720, lerp(1.7, 1, oback(ap, 1.6)) * (1 + (.06 * math.exp(-(tau - sel_t) / .12) if sel >= 0 else 0)), 0, clamp(ap * 6))
    vals = SHARES[tabs[si]]; pv = SHARES[tabs[pi]] if sel > 0 else [16820] * 4; names = ["Hemant", "Anusha", "Deepa", "Girija"]; d = ImageDraw.Draw(cv)
    for i in range(4):
        ap2 = prog(tau, .45 + i * .06, .4)
        if ap2 <= 0: continue
        ry = ROWS_Y[i]; flick = prog(tau, sel_t + i * .035, .3) if sel >= 0 else 1; bump = 1 + .18 * math.sin(math.pi * clamp(flick)) * (1 if sel >= 0 else 0)
        x0, y0, x1, y1 = 930, 720, 1020, ry; pts = [(lerp(x0, x1, ocubic(u)), lerp(y0, y1, u)) for u in np.linspace(0, 1, 24)]; d.line(pts, fill=(80, 80, 80), width=4)
        u = (t * 1.2 + i * .13) % 1 if sel < 0 else clamp(prog(tau, sel_t, .5) * 1.1); px, py = lerp(x0, x1, ocubic(u)), lerp(y0, y1, u); d.ellipse([px - 9, py - 9, px + 9, py + 9], fill=WHITE)
        guest = i == 3; place(cv, avatar(names[i][0], 130, guest, SOFT, ICON, (240, 240, 240) if guest else None), 1090, ry, spring(ap2), 0, clamp(ap2 * 5))
        nm = tsp(names[i], 600, 40, WHITE); place(cv, nm, 1190 + nm.width / 2 - 10, ry - 34, 1, 0, ap2)
        if guest: place(cv, rr(104, 36, 18, (255, 255, 255, 40)), 1190 + 60, ry - 34 + 0 + 52 - 52 + 0, 0, 0, 0)
        v = lerp(pv[i], vals[i], spring(prog(tau, sel_t, .4), 1.1, 7) if sel >= 0 else 1); bw = max(24, 360 * v / 30000 * ocubic(prog(tau, .6, .5)))
        d.rounded_rectangle([1190, ry + 14, 1190 + bw, ry + 54], 20, fill=BAR_COL[i])
        chip = tsp("₹{:,}".format(vals[i]), 800, 46, BLK); cb = rr(chip.width + 44, 76, 38, WHITE).copy(); cb.alpha_composite(chip, (22, 10))
        place(cv, cb, 1190 + bw + 30 + cb.width / 2, ry + 34, spring(ap2) * bump, 0, clamp(ap2 * 5))
        if guest: place(cv, tsp("Guest", 400, 26, (200, 200, 200)), 1190 + nm.width + 64, ry - 30, 1, 0, ap2)
    lp = prog(tau, .6, .5)
    if lp > 0:
        d.line([(1030, 960), (1030 + 800 * ocubic(lp), 960)], fill=(90, 90, 90), width=3); place(cv, tsp("Total", 500, 42, (200, 200, 200)), 1030 + 40, 1008, 1, 0, lp); place(cv, tsp("₹67,280", 800, 52, WHITE), 1830 - 90, 1008, 1, 0, lp)
    cp = prog(tau, 2.34, .5)
    if cp > 0:
        pill = rr(560, 100, 50, LEMON).copy(); pill.alpha_composite(tsp("Adds up. Always.", 700, 48, BLK), (68, 16)); place(cv, pill, 1430, 1140, spring(cp, 1.2, 7), 0, clamp(cp * 5))
    return cv

def sc_settle(t):
    tau = t - T_SETTLE; cv = bg(LEMON)
    for i, r in enumerate([380, 640, 900]): ring_mask(cv, 1370, 560, r, 3, BLK, .06)
    title(cv, t, "SETTLE UP", "in plain words", BLK, ICON, T_SETTLE + .05, y=270, maxw=700, cx=480)
    rise = ocubic(prog(tau, .25, .6)); y = lerp(1100, 440, rise); flip = prog(tau, 1.5, .42); fx = abs(math.cos(math.pi * flip)) if flip < 1 else 1.0; done = flip >= .5
    card = Image.new("RGBA", (940, 470), (0, 0, 0, 0))
    if not done:
        card.alpha_composite(rr(940, 470, 64, WHITE)); card.alpha_composite(tsp("Your balance", 400, 46, GREY), (64, 70)); card.alpha_composite(tsp("You owe ₹14,226.00", 500, 84, BLK, -.02), (64, 200))
    else:
        card.alpha_composite(rr(940, 470, 64, BLK)); card.alpha_composite(checkdot(150, WHITE, BLK), (64, 70)); card.alpha_composite(tsp("You're all square", 800, 76, WHITE, -.02), (64, 250)); card.alpha_composite(tsp("₹0.00 to settle", 500, 48, (200, 200, 200)), (64, 350))
    place(cv, shadow("sc", rr(940, 470, 64, (0, 0, 0)), 34, .16), 1370, y + 26, 1, 0, rise * (fx if flip < 1 else 1), sy=max(fx, .02)); place(cv, card, 1370, y, 1.0 + .03 * math.sin(math.pi * flip), 0, rise, sy=max(fx, .02))
    rp = prog(tau, .6, .5)
    if rp > 0:
        paid = tau > 1.42; row = Image.new("RGBA", (940, 150), (0, 0, 0, 0)); row.alpha_composite(avatar("A", 96), (0, 27)); row.alpha_composite(tsp("Settled with Praveen" if tau >= 1.5 else "You owe Praveen ₹14,226.00", 500, 44, BLK), (124, 48))
        lab = "Paid" if paid else "Settle up"; btn = rr(230, 88, 44, BLK if paid else (233, 233, 233)).copy(); lw = tsp(lab, 600, 40, WHITE if paid else BLK); btn.alpha_composite(lw, (115 - lw.width // 2, 20)); row.alpha_composite(btn, (710, 31))
        place(cv, tsp("To settle up", 600, 46, BLK), 1370 - 470 + 110, y + 320, 1, 0, rp); place(cv, row, 1370, y + 440, 1, 0, rp)
        if 1.4 < tau < 2.0: ring_mask(cv, 1370 + 255, y + 440, 10 + 160 * ocubic(prog(tau, 1.4, .6)), 6, BLK, .5 * (1 - prog(tau, 1.4, .6)))
    particles(cv, 21, 120, t, T_SETTLE + 1.52, (1370, y + 100), 800, 2100, 1700, 2.0, STRIPES + [BLK], (16, 38), (200, 340))
    particles(cv, 22, 60, t, T_SETTLE + 1.52, (1370, y + 100), 400, 1700, 1700, 2.0, STRIPES, (14, 30), (200, 340))
    sp = prog(tau, 2.2, .5)
    if sp > 0: place(cv, tsp("Everyone is settled.", 800, 56, BLK, -.02), 470, 640 + (1 - ocubic(sp)) * 40, 1, 0, sp)
    return cv

SOX, SOY = 760, -530
@lru_cache(None)
def checkdot(d, bgc=BLK, fg=WHITE):
    k = 3; im = Image.new("RGBA", (d * k, d * k), (0, 0, 0, 0)); dr = ImageDraw.Draw(im); dr.ellipse([0, 0, d * k - 1, d * k - 1], fill=col(bgc))
    dr.line([(d * k * .28, d * k * .52), (d * k * .44, d * k * .67), (d * k * .74, d * k * .35)], fill=col(fg), width=int(d * k * .09), joint="curve"); return im.resize((d, d), Image.LANCZOS)
def sc_stamp(t):
    tau = t - T_STAMP; cv = bg(SKY)
    title(cv, t, "COLLECT", "every trip, a stamp", BLK, ICON, T_STAMP - .12, y=270, maxw=680, cx=440)
    hits = [.47, .9375, 1.406, 1.875]; imp = sum(math.exp(-(tau - h) / .08) for h in hits if tau >= h)
    page = rr(940, 1130, 56, (253, 250, 244)); pp = prog(tau, 0, .5); ps = lerp(1.1, 1, ocubic(pp)) * (1 - .012 * imp); pcx, pcy = 540 + SOX, 1170 + SOY
    place(cv, shadow("page", page, 40, .2), pcx, pcy + 30, ps, -2 * (1 - pp) - 1.5, pp); place(cv, page, pcx, pcy, ps, -2 * (1 - pp) - 1.5, pp)
    for img, cxy, rot, tt in [("friends", (735, 900), 7, .0), ("default-cover", (360, 1340), -6, .2)]:
        q = prog(tau, tt, .5)
        if q <= 0: continue
        ph = Image.open(f"{ROOT}/assets/illustrations/{img}.jpg").convert("RGB"); s = 400 / min(ph.size); ph = ph.resize((int(ph.width * s), int(ph.height * s)), Image.LANCZOS); ph = ph.crop(((ph.width - 400) // 2, (ph.height - 400) // 2, (ph.width + 400) // 2, (ph.height + 400) // 2))
        pol = Image.new("RGBA", (452, 520), (255, 255, 255, 255)); pol.paste(ph, (26, 26)); pol = Image.composite(pol, Image.new("RGBA", pol.size, (0, 0, 0, 0)), rr(452, 520, 14, WHITE).getchannel("A"))
        e = spring(q, 1.1, 6); placeS(cv, pol, "pol" + img, cxy[0] + SOX, lerp(-300, cxy[1] + SOY, e), .82, rot + (1 - e) * 24, 1, lift=18, blur=26, op=.28)
    for kind, cxy, rot, h0, sz in [("dep", (330, 860), -11, hits[0], .86), ("arr", (720, 1420), 7, hits[1], .86), ("ooty", (330, 1630), 9, hits[2], .58), ("ring", (790, 1030), -14, hits[3], .6)]:
        q = prog(tau, h0, .14)
        if q <= 0: continue
        cx_, cy_ = cxy[0] + SOX, cxy[1] + SOY; s = lerp(2.6, 1.0, ocubic(q)) * sz * (1 + .05 * math.sin(math.pi * prog(tau, h0 + .14, .18)))
        place(cv, stamp(kind), cx_, cy_, s, rot, clamp(q * 3) * .96); d = prog(tau, h0 + .1, .45)
        if 0 < d < 1: ring_mask(cv, cx_, cy_, 120 + 380 * ocubic(d), 8 * (1 - d) + 1, BLK, .22 * (1 - d))
        particles(cv, 31 + int(h0 * 10), 16, t, T_STAMP + h0 + .1, (cx_, cy_), 200, 700, 900, .7, [(138, 42, 134) if kind == "dep" else (42, 61, 154) if kind == "arr" else BLK], (6, 14), shapes="c")
    return cv

MONT = [("TRIP", "1-home", PEACH, BLK), ("PLAN", "5-day2", PERI, BLK), ("SPEND", "3-expenses", LEMON, BLK), ("SPLIT", "9-add-expense", BLK, WHITE),
        ("SETTLE", "7-balances", OLIVE, BLK), ("STAMP", "8-stamps", SKY, BLK), ("REMEMBER", "polaroids", BEIGE, BLK), ("TOGETHER.", None, WHITE, BLK)]
@lru_cache(None)
def pol_sprite(img):
    ph = Image.open(f"{ROOT}/assets/illustrations/{img}.jpg").convert("RGB"); s_ = 400 / min(ph.size); ph = ph.resize((int(ph.width * s_), int(ph.height * s_)), Image.LANCZOS); ph = ph.crop(((ph.width - 400) // 2, (ph.height - 400) // 2, (ph.width + 400) // 2, (ph.height + 400) // 2))
    pol = Image.new("RGBA", (452, 520), (255, 255, 255, 255)); pol.paste(ph, (26, 26)); return Image.composite(pol, Image.new("RGBA", pol.size, (0, 0, 0, 0)), rr(452, 520, 14, WHITE).getchannel("A"))
def sc_mont(t):
    tau = t - T_MONT; step = BEAT / 2; k = min(7, int(tau / step)); loc = tau - k * step; word, scr, bgc, fg = MONT[k]
    cv = Image.new("RGB", (W, H), bgc); q = prog(loc, 0, .12); alt = 1 if k % 2 else -1; px = 1360 if alt < 0 else 560; wx = 560 if alt < 0 else 1360
    for i in range(5): ring_mask(cv, px, 700, 200 + i * 240 + 140 * ocubic(prog(loc, 0, .2)), 3, fg, .07)
    if scr == "polaroids":
        sz = fit(word, 900, 880, -.04); place(cv, tsp(word, 900, sz, fg, -.04), wx, 640, lerp(1.4, 1, ocubic(q)), (1 - q) * (-4 if k % 2 else 4), clamp(q * 8))
        for img, dx, dyy, rot in [("friends", -120, -90, -7), ("default-cover", 110, 120, 6)]:
            placeS(cv, pol_sprite(img), "polm" + img, px + dx, lerp(1300, 640 + dyy, ocubic(q)), 1.05, rot * (1 + (1 - q)), 1, lift=18, blur=26, op=.28)
    elif scr:
        sz = fit(word, 900, 880, -.04); place(cv, tsp(word, 900, sz, fg, -.04), wx, 640, lerp(1.4, 1, ocubic(q)), (1 - q) * (-4 if k % 2 else 4), clamp(q * 8))
        place_persp(cv, phone_static(scr), px + alt * -lerp(80, 0, ocubic(q)), lerp(1000, 800, ocubic(q)) + loc * 30, lerp(1.1, .8, ocubic(q)), yaw=alt * lerp(24, 8, q), pitch=lerp(14, 4, q), roll=alt * lerp(10, 2, q))
    else:
        sz = fit(word, 900, 1500, -.04); place(cv, tsp(word, 900, sz, fg, -.04), W / 2, 640, lerp(1.6, 1, ocubic(q)), 0, clamp(q * 8))
    return cv

def sc_final(t):
    tau = t - T_FIN; cv = bg(WHITE); WY = 470
    wm = wordmark(BLK, 1120); n = 16; bw = wm.width / n; ph = Image.new("RGBA", wm.size, (0, 0, 0, 0))
    for i in range(n):
        q = ocubic(prog(tau, .05 + i * .02, .38)); strip = wm.crop((int(i * bw), 0, int((i + 1) * bw) + 1, wm.height)); ph.paste(strip, (int(i * bw), int((1 - q) * wm.height * .9)), strip)
    land = 1 + .035 * math.sin(math.pi * prog(tau, .55, .35)); drift = 1 + .03 * prog(tau, .9, 2.85)
    place(cv, ph, W / 2, WY, land * drift)
    for i, c in enumerate(STRIPES):   # the splash stripes settle under the logo
        q = prog(tau, .75 + i * .06, .35)
        if q > 0: place(cv, rr(150, 20, 10, c), W / 2 - 3 * 160 + 80 + i * 160, 810, spring(q), 0, clamp(q * 5))
    phr = ["Plan the days.", "Split the costs.", "Keep the memories."]; pws = [tsp(p_, 300, 58, BLK).width for p_ in phr]; tot = sum(pws) + 2 * 70; x0 = W / 2 - tot / 2
    for i, (p_, tt) in enumerate(zip(phr, [.9, 1.3, 1.875])):
        q = prog(tau, tt, .4)
        if q > 0: place(cv, tsp(p_, 300, 58, BLK), x0 + sum(pws[:i]) + i * 70 + pws[i] / 2, 940 + (1 - ocubic(q)) * 36, 1, 0, q)
    particles(cv, 41, 90, t, T_FIN + BAR, (W / 2, WY), 800, 1900, 1400, 1.6, STRIPES + [BLK], (14, 34))
    tint(cv, BLK, 1 - prog(tau, 0, .22)); return cv

# ---------- transitions ----------
def cover_stripes(cv, t, tb):
    d = ImageDraw.Draw(cv)
    for i in range(6):
        pin = ocubic(prog(t, tb - .42 + i * .035, .22)); pout = ocubic(prog(t, tb + .02 + i * .035, .22))
        L, R = W * pout, W * pin
        if R > L: d.rectangle([L - 2, i * H / 6 - 1, R + 2, (i + 1) * H / 6 + 1], fill=STRIPES[i])
def cover_iris(cv, t, tb, cx, cy, c):
    pin = ocubic(prog(t, tb - .3, .3)); pout = ocubic(prog(t, tb, .32)); R = 1900
    ov = Image.new("RGB", cv.size, c); m = Image.new("L", cv.size, 0); d = ImageDraw.Draw(m)
    if pout <= 0:
        if pin > 0: r = R * pin; d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    else: d.rectangle([0, 0, W, H], fill=255); r = R * pout; d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=0)
    cv.paste(ov, (0, 0), m.filter(ImageFilter.GaussianBlur(1.2)))
def cover_slash(cv, t, tb, c):
    pin = ocubic(prog(t, tb - .28, .28)); pout = ocubic(prog(t, tb, .28)); k = .42; d = ImageDraw.Draw(cv)
    xe = lambda p, y: -W * 1.0 + p * W * 2.9 + k * (y - H / 2)
    if pout <= 0: d.polygon([(-W, 0), (xe(pin, 0), 0), (xe(pin, H), H), (-W, H)], fill=c)
    else: d.polygon([(xe(pout, 0), 0), (W * 2, 0), (W * 2, H), (xe(pout, H), H)], fill=c)
def cover_slab(cv, t, tb, c):
    top = H * (1 - ocubic(prog(t, tb - .3, .3))); bot = H * (1 - ocubic(prog(t, tb, .3)))
    if bot > top: ImageDraw.Draw(cv).rectangle([0, top - 1, W, bot + 1], fill=c)

def transitions(cv, t):
    if abs(t - T_PLAN) < .5: cover_stripes(cv, t, T_PLAN)
    if abs(t - T_SPLIT) < .5: cover_iris(cv, t, T_SPLIT, PCX, 640, PERI)
    if abs(t - T_EXACT) < .5: cover_slash(cv, t, T_EXACT, STRIPES[2])
    if abs(t - T_SETTLE) < .5: cover_slab(cv, t, T_SETTLE, STRIPES[4])
    if abs(t - T_STAMP) < .5: cover_iris(cv, t, T_STAMP, 1300, 640, SKY)
    if abs(t - T_MONT) < .12: tint(cv, WHITE, 1 - abs(t - T_MONT) / .12)
    if abs(t - T_FIN) < .02: pass
    return cv

# ---------- camera / post ----------
IMP = [(T_DROP, 1.0), (T_DROP + .0, 0)] + [(T_FIN + .9375, .8), (T_STAMP + .47, .8), (T_STAMP + .9375, .9), (T_STAMP + 1.406, .9), (T_STAMP + 1.875, 1.0), (T_FIN + BAR, .7), (T_SPLIT + 2.344, .5), (T_SETTLE + 1.5, .6), (T_SPLIT + 3.28, .7), (T_PLAN, .5), (T_SPLIT, .5), (T_EXACT, .5), (T_SETTLE, .5), (T_STAMP, .5), (T_MONT, .6), (T_FIN, .8), (T_VAC, 1.0)]
def energy(t, dec=.12): return sum(s * math.exp(-(t - ti) / dec) for ti, s in IMP if t >= ti)
VIG = None
def frame_pil(t):
    if t < T_VAC: cv = sc_chaos(t)
    elif t < T_DROP: cv = sc_vac(t)
    elif t < T_PLAN: cv = sc_drop(t)
    elif t < T_SPLIT: cv = sc_plan(t)
    elif t < T_EXACT: cv = sc_split(t)
    elif t < T_SETTLE: cv = sc_exact(t)
    elif t < T_STAMP: cv = sc_settle(t)
    elif t < T_MONT: cv = sc_stamp(t)
    elif t < T_FIN: cv = sc_mont(t)
    else: cv = sc_final(t)
    if t < T_VAC:
        k = clamp(t / 3.3); cv = glitch(cv, max(0, (k - .8) * 4), int(t * 30))
    cv = transitions(cv, t)
    e = energy(t); z = 1 + .035 * e
    for a_, b_ in [(T_PLAN, T_SPLIT), (T_SPLIT, T_EXACT), (T_EXACT, T_SETTLE), (T_SETTLE, T_STAMP), (T_STAMP, T_MONT)]:
        if a_ <= t < b_: z *= 1 + .045 * prog(t, a_, 3.75)
    if t >= T_FIN: z *= 1 + .02 * prog(t, T_FIN, 3.75)
    if T_DROP <= t < T_MONT: z += .012 * math.exp(-((t - T_DROP) % BEAT) / .09)
    if t < T_VAC: z = 1 + .12 * clamp(t / 3.3) ** 2 + .02 * math.sin(t * 40) * clamp(t / 3.3)
    ox = (hsh(int(t * 60)) - .5) * 26 * e + ((hsh(int(t * 50) + 7) - .5) * 14 * clamp(t / 3.3) ** 3 if t < T_VAC else 0); oy = (hsh(int(t * 60) + 3) - .5) * 26 * e
    if z != 1 or ox or oy:
        cv = cv.transform((W, H), Image.AFFINE, (1 / z, 0, W / 2 - (W / 2 + ox) / z, 0, 1 / z, H / 2 - (H / 2 + oy) / z), Image.BILINEAR)
    return cv, e

def frame_np(i, shutter=.5, ns=5):
    acc = None; ts = [i / FPS + (k / ns - .5) * shutter / FPS for k in range(ns)]
    for t in ts:
        im, e = frame_pil(max(0, t)); a = np.asarray(im, np.float32); acc = a if acc is None else acc + a
    a = acc / ns; t = i / FPS; e = energy(t)
    ca = int(2 + 16 * min(e, 1.2) + (14 * clamp(t / 3.3) ** 3 if t < T_VAC else 0))
    a = np.stack([np.roll(a[..., 0], ca, 1), a[..., 1], np.roll(a[..., 2], -ca, 1)], -1)
    global VIG
    if VIG is None:
        y, x = np.mgrid[0:H, 0:W].astype(np.float32); r = ((x - W / 2) / (W / 2)) ** 2 + ((y - H / 2) / (H / 2)) ** 2; VIG = (1 - .16 * r / 2)[..., None]
    a = a * VIG + np.random.RandomState(i).standard_normal((H, W, 1)).astype(np.float32) * 1.8
    return np.clip(a, 0, 255).astype(np.uint8)

def _w(i): return frame_np(i).tobytes()

if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "still":
        out = os.environ.get("OUT", "/tmp/stills"); os.makedirs(out, exist_ok=True)
        for s in sys.argv[2:]: Image.fromarray(frame_np(int(round(float(s) * FPS)))).save(f"{out}/{float(s):06.3f}.png")
    elif cmd == "video":
        from multiprocessing import Pool
        n = int(DUR * FPS); dst = sys.argv[2]
        ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", dst], stdin=subprocess.PIPE)
        with Pool(9) as p:
            for k, b in enumerate(p.imap(_w, range(n), chunksize=2)):
                ff.stdin.write(b)
                if k % 60 == 0: print(k, flush=True)
        ff.stdin.close(); ff.wait()
