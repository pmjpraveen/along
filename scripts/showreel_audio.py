# Score + SFX for the along showreel, pure numpy. Timing comes from showreel.py so picture and sound share one clock.
import sys, wave, math
import numpy as np
import showreel as S

SR = 44100; N = int(S.DUR * SR); rng = np.random.RandomState(7)
dry = np.zeros((N, 2), np.float32); wet = np.zeros((N, 2), np.float32); duck = np.ones(N, np.float32)   # duck: sidechain curve applied to pads/bass
T = lambda n: np.arange(int(n * SR)) / SR

def put(buf, sig, t, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i < 0: return
    sig = sig[:N - i]; l = g * math.cos((pan + 1) * math.pi / 4); r = g * math.sin((pan + 1) * math.pi / 4)
    buf[i:i + len(sig), 0] += sig * l; buf[i:i + len(sig), 1] += sig * r
def env(n, d, a=.002): t = T(n); return np.minimum(t / a, 1) * np.exp(-t / d)
def noise(n): return rng.uniform(-1, 1, int(n * SR)).astype(np.float32)
def fband(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X[(f < lo) | (f > hi)] = 0; return np.fft.irfft(X, len(x)).astype(np.float32)
def sweep(n, f0, f1, curve=2.0):
    t = T(n); u = t / n; f = f0 + (f1 - f0) * u ** curve; return np.sin(2 * np.pi * np.cumsum(f) / SR).astype(np.float32)
def sine(f, n): return np.sin(2 * np.pi * f * T(n)).astype(np.float32)
def hz(m): return 440 * 2 ** ((m - 69) / 12)

def kick(t, g=1.0):
    n = .38; tt = T(n); f = 46 + 150 * np.exp(-tt / .022); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .17)
    s = s + .35 * fband(noise(.01), 2000, 9000).repeat(1)[:0].sum() if False else s
    click = np.zeros_like(s); click[:int(.004 * SR)] = noise(.004)[:int(.004 * SR)] * .5
    put(dry, (s + click).astype(np.float32), t, .95 * g)
    i = int(t * SR); L = int(.28 * SR); c = np.minimum(np.arange(L) / (.012 * SR), 1)  # sidechain pump
    duck[i:i + L] = np.minimum(duck[i:i + L], (.18 + .82 * c ** 1.6)[:max(0, min(L, N - i))])
def clap(t, g=1.0):
    s = fband(noise(.3), 900, 7000) * env(.3, .07, .001); s += fband(noise(.3), 1500, 5000) * np.roll(env(.3, .02, .001), 0)
    put(dry, s * .5 * g, t, 1, -.1); put(wet, s * .4 * g, t, 1, .1)
def hat(t, g=1.0, o=False):
    d = .16 if o else .03; s = fband(noise(d * 5), 7000, 16000) * env(d * 5, d, .0005); put(dry, s * .22 * g, t, 1, .3 if int(t * 100) % 2 else -.3)
def tick(t, g=1.0, f=1800):
    s = (sine(f, .03) * env(.03, .008, .0005) * .5 + fband(noise(.03), 2500, 9000) * env(.03, .005, .0003) * .5); put(dry, s * g, t, 1, rng.uniform(-.4, .4))
def ping(t, f=1760, g=1.0, pan=0):
    s = (sine(f, .5) + .4 * sine(f * 2.005, .5)) * env(.5, .13, .001); put(dry, s * .35 * g, t, 1, pan); put(wet, s * .25 * g, t, 1, -pan)
def pop(t, f=520, g=1.0):
    n = .12; tt = T(n); ff = f * (1 + 1.2 * np.exp(-tt / .015)); s = np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-tt / .04); put(dry, s * .5 * g, t, 1, rng.uniform(-.3, .3))
def whoosh(t, n=.5, f0=300, f1=6000, g=1.0, pan=0.0, rev=False):
    x = noise(n); u = np.linspace(0, 1, len(x)); out = np.zeros_like(x)
    for k in range(6):   # sliding band via crossfaded static bands
        c = f0 * (f1 / f0) ** (k / 5); band = fband(x, c * .6, c * 1.5); w = np.exp(-((u - k / 5) ** 2) / .03); out += band * w
    e = np.sin(np.pi * u) ** 1.4; out *= e; out /= (np.abs(out).max() + 1e-6)
    if rev: out = out[::-1] * (u ** 1.5)
    put(dry, out * .55 * g, t, 1, pan); put(wet, out * .3 * g, t, 1, -pan)
def thud(t, g=1.0, f=62):
    n = .55; tt = T(n); ff = f + 90 * np.exp(-tt / .02); s = np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-tt / .12)
    sl = fband(noise(.2), 150, 3500) * env(.2, .035, .0005) * .7; put(dry, s * .95 * g, t); put(dry, sl * g, t, 1, rng.uniform(-.2, .2)); put(wet, sl * .4 * g, t)
def boom(t, g=1.0):
    put(dry, sine(36, 2.2) * env(2.2, .6, .004) * .9 * g, t); put(dry, sweep(1.2, 180, 30, .5) * env(1.2, .25, .002) * .45 * g, t)
    cr = fband(noise(2.0), 3000, 14000) * env(2.0, .45, .001); put(dry, cr * .35 * g, t, 1, .0); put(wet, cr * .3 * g, t)
def coin(t, g=1.0):
    s = sum(a * sine(f, .6) * env(.6, d, .0008) for f, a, d in [(2637, 1, .22), (3951, .7, .16), (5274, .4, .1), (1319, .5, .3)]) * .25; put(dry, s * g, t, 1, .15); put(wet, s * .6 * g, t, 1, -.2)
def chime(t, notes, step=.075, g=1.0):
    for i, m in enumerate(notes):
        f = hz(m); s = (sine(f, 1.4) + .3 * sine(f * 3, 1.4) * np.exp(-T(1.4) / .2)) * env(1.4, .5, .002); put(dry, s * .22 * g, t + i * step, 1, -.4 + .8 * i / max(1, len(notes) - 1)); put(wet, s * .4 * g, t + i * step, 1)
def stab(t, notes, g=1.0, n=2.2):
    s = 0
    for m in notes:
        for d in (-.12, .12):
            f = hz(m) * 2 ** (d / 12 * .1); tt = T(n); saw = sum(np.sin(2 * np.pi * f * k * tt) / k for k in range(1, 9)); s = s + saw
    s = s / (len(notes) * 2) * env(n, .55, .006); put(dry, s * .35 * g, t); put(wet, s * .6 * g, t)

# ---------- score ----------
CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55, 59], [55, 59, 62]]     # Am, F, C(maj7), G
ROOT = [33, 29, 36, 31]
def pad(bar_t, ci, n, g=1.0):
    tt = T(n); s = 0
    for m in CH[ci]:
        for dt in (-.08, 0, .08):
            f = hz(m + 12) * 2 ** (dt / 12); s = s + sum(np.sin(2 * np.pi * f * k * tt + k) / (k * k) for k in range(1, 5))
    e = np.minimum(tt / .15, 1) * np.minimum((n - tt) / .15, 1)
    s = (s / 8 * e).astype(np.float32); put(PADBUS, s * .28 * g, bar_t, 1, 0)
PADBUS = np.zeros((N, 2), np.float32); BASSBUS = np.zeros((N, 2), np.float32)
def bass(t, m, n, g=1.0):
    tt = T(n); f = hz(m); s = np.sin(2 * np.pi * f * tt) + .45 * np.sin(4 * np.pi * f * tt + .5) + .2 * np.sin(6 * np.pi * f * tt); s = s * np.minimum(tt / .005, 1) * np.minimum((n - tt) / .02, 1)
    put(BASSBUS, s.astype(np.float32) * .5 * g, t)
def arp(t, m, g=1.0, pan=0):
    f = hz(m); tt = T(.35); s = (np.sin(2 * np.pi * f * tt) + .5 * np.sin(4 * np.pi * f * tt) * np.exp(-tt / .05) + .25 * np.sin(6 * np.pi * f * tt) * np.exp(-tt / .03)) * np.exp(-tt / .09) * np.minimum(tt / .002, 1)
    put(dry, s.astype(np.float32) * .2 * g, t, 1, pan); put(wet, s.astype(np.float32) * .3 * g, t, 1, -pan)

def build():
    B = S.BEAT; s16 = B / 4
    # --- chaos: pings + riser + heartbeat tension ---
    for i, t in enumerate(S.CT):
        ping(t, [1760, 1319, 2093, 1568][i % 4], .55 + .45 * min(1, i / 8), (-.6 if S.CHAT[i % len(S.CHAT)][0] != "A" else .6))
        if i < 14: tick(t + .01, .35 * min(1, .4 + i / 8), 900 + 60 * i)
    r = fband(noise(3.35), 200, 9000); u = np.linspace(0, 1, len(r)); riser = np.zeros_like(r)
    for k in range(7):
        c = 300 * (9000 / 300) ** (k / 6); riser += fband(r, c * .6, c * 1.4) * np.exp(-((u - k / 6) ** 2) / .045)
    riser = riser / (np.abs(riser).max() + 1e-6) * u ** 2.2; put(dry, riser * .5, 0, 1); put(wet, riser * .25, 0, 1)
    put(dry, sweep(3.35, 120, 1900, 2.6) * (np.linspace(0, 1, int(3.35 * SR)) ** 3) * .22, 0)
    for k in range(1, 40):   # accelerating sub heartbeat
        t = 3.3 * (1 - (1 - k / 40) ** 1.6)
        if t < 3.3: put(dry, sine(55, .2) * env(.2, .06, .002) * (.2 + .5 * t / 3.3), t)
    # --- vacuum: reverse swell, one blip, silence ---
    put(dry, np.zeros(1, np.float32), 3.4); ping(3.52, 2637, .5); put(dry, (fband(noise(.35), 1500, 12000) * np.linspace(0, 1, int(.35 * SR)) ** 3).astype(np.float32) * .35, 3.40)
    # --- drop ---
    boom(S.T_DROP); stab(S.T_DROP, CH[0], 1.1, 3.2)
    for k in range(6): tick(S.T_DROP + .55 + k * .12, .4, 1500 + 200 * k)
    # groove bars 2..13 (3.75 -> 26.25)
    b0 = S.T_DROP; nbar = int((S.T_FIN - b0) / S.BAR + .01)
    for b in range(nbar):
        bt = b0 + b * S.BAR; ci = b % 4
        for q in range(4): kick(bt + q * B)
        if b >= 0:
            for q in (1, 3): clap(bt + q * B, .7 if b < 2 else 1)
        for q in range(8):
            if b >= 1: hat(bt + q * B / 2 + (B / 2 if True else 0) * 0, .6 if q % 2 == 0 else 1.0, False) if q % 2 == 1 else hat(bt + q * B / 2, .35)
        if b % 2 == 1: hat(bt + 3.5 * B, 1, True)
        pad(bt, ci, S.BAR + .1, .9 if b < 11 else 1.1)
        for q in range(8):
            if b >= 1: bass(bt + q * B / 2 + (0 if q % 2 == 0 else 0), ROOT[ci] + (12 if q in (3, 7) else 0), B / 2 * .8, 1.0 if q % 2 else .7)
        if b >= 2:
            chord = CH[ci]; pat = [0, 2, 1, 2, 0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 1]
            for q in range(16): arp(bt + q * s16, chord[pat[q] % len(chord)] + (24 if q % 4 == 3 else 12), .5 + .5 * (q % 4 == 0), -.5 + (q % 8) / 8)
    # snare roll through the montage bar
    for q in range(16):
        t = S.T_MONT + q * s16; clap(t, .5 + .5 * q / 16); 
    for i in range(8):
        t = S.T_MONT + i * B / 2; thud(t, .6, 120 + 14 * i); whoosh(t - .06, .22, 800, 7000, .5, (-1) ** i * .5)
    r = fband(noise(S.BAR), 400, 10000) * (np.linspace(0, 1, int(S.BAR * SR)) ** 2); put(dry, r * .35, S.T_MONT)
    # --- finale outro: kicks stop after beat 4, last chord at bar 15 ---
    boom(S.T_FIN, 1.0); stab(S.T_FIN, CH[1], 1.0, 2.6)
    for q in range(4): kick(S.T_FIN + q * B)
    for q in range(1, 4): clap(S.T_FIN + q * B * 1, .6) if q % 2 == 1 else None
    stab(S.T_FIN + S.BAR, [60, 64, 67, 71, 76], 1.2, 2.4); put(wet, sine(hz(48), 2.0) * env(2.0, .8) * .4, S.T_FIN + S.BAR)
    boom(S.T_FIN + S.BAR, .4); ping(S.T_FIN + 2.0, 2637, .8); ping(S.T_FIN + 2.12, 3136, .7); ping(S.T_FIN + 2.24, 3951, .8)

    # --- transitions + scene SFX ---
    for i in range(6): tick(S.T_PLAN - .42 + i * .035 + .2, .5, 700 + 150 * i)
    whoosh(S.T_PLAN - .45, .5, 200, 7000, 1, -.5); whoosh(S.T_PLAN - .05, .5, 7000, 300, .7, .5, True)
    whoosh(S.T_PLAN + .1, .7, 250, 3000, .6)
    for tt in (1.15, 1.55): pop(S.T_PLAN + tt, 480, .9); whoosh(S.T_PLAN + tt, .35, 500, 4500, .5, rng.uniform(-.6, .6))
    for tt in (2.15, 2.8): ping(S.T_PLAN + tt, 1568 if tt < 2.5 else 2093, .8); pop(S.T_PLAN + tt, 700, .6)
    for k, ch in enumerate("PLAN"): tick(S.T_PLAN + .05 + k * .04, .5, 900 + 120 * k)
    whoosh(S.T_SPLIT - .3, .45, 200, 5000, 1, 0); thud(S.T_SPLIT, .7)
    for k in range(4): tick(S.T_SPLIT + .72 + k * .14, .9, 1500 + 120 * k); pop(S.T_SPLIT + .72 + k * .14, 700 + 80 * k, .35)
    for k in range(17): tick(S.T_SPLIT + 1.4 + k * .045, .45, 2200 + 90 * (k % 5))
    pop(S.T_SPLIT + 2.344, 380, 1.0); thud(S.T_SPLIT + 2.344, .5, 85)
    for k, d in enumerate((0, .234, .468)): thud(S.T_SPLIT + 2.344 + d + .08, .55, 70); coin(S.T_SPLIT + 2.344 + d + .1, .7); whoosh(S.T_SPLIT + 2.344 + d - .05, .3, 400, 5000, .45, -.4 + .4 * k)
    boom(S.T_SPLIT + 3.28, .6); chime(S.T_SPLIT + 3.28, [72, 76, 79, 84], .05, .8)
    whoosh(S.T_EXACT - .3, .4, 300, 6500, 1, .6); thud(S.T_EXACT, .6)
    pop(S.T_EXACT + .25, 300, 1.0); thud(S.T_EXACT + .27, .6, 75)
    for k in range(5): tick(S.T_EXACT + .35 + k * B, 1, 1200 + 250 * k); whoosh(S.T_EXACT + .35 + k * B - .02, .25, 1500, 9000, .4, -.5 + k / 3)
    for i in range(4): pop(S.T_EXACT + .45 + i * .06, 600 + 90 * i, .55)
    for k in range(4):
        for i in range(4): pop(S.T_EXACT + .35 + k * B + i * .035, 500 + 80 * i, .25)
    whoosh(S.T_EXACT + .6, .5, 500, 4000, .4, 0); chime(S.T_EXACT + 2.34, [76, 83, 88], .06, .9)
    whoosh(S.T_SETTLE - .32, .4, 150, 4000, 1, 0, False); thud(S.T_SETTLE, .6, 55)
    whoosh(S.T_SETTLE + .25, .6, 300, 4500, .6); tick(S.T_SETTLE + 1.38, 1.2, 1100); pop(S.T_SETTLE + 1.38, 400, .9)
    whoosh(S.T_SETTLE + 1.5, .4, 700, 5000, .6, 0); 
    for k in range(80): tick(S.T_SETTLE + 1.52 + abs(rng.normal(0, .25)), .12 + rng.rand() * .2, 2500 + rng.rand() * 3000)
    pop(S.T_SETTLE + 1.52, 260, 1.0); boom(S.T_SETTLE + 1.52, .45); coin(S.T_SETTLE + 1.55, 1.0); chime(S.T_SETTLE + 1.58, [72, 76, 79, 84, 88], .07, 1.0)
    ping(S.T_SETTLE + 2.2, 2093, .7)
    whoosh(S.T_STAMP - .3, .4, 300, 6000, 1, 0); thud(S.T_STAMP, .6, 60)
    for tt in (.0, .2): whoosh(S.T_STAMP + tt - .08, .22, 1500, 6000, .4, rng.uniform(-.5, .5)); tick(S.T_STAMP + tt + .12, .7, 400)
    for tt in (.47, .9375, 1.406, 1.875): whoosh(S.T_STAMP + tt - .16, .18, 800, 7000, .5, rng.uniform(-.4, .4)); thud(S.T_STAMP + tt, 1.2); thud(S.T_STAMP + tt, .5, 45)
    chime(S.T_STAMP + 2.3, [79, 83, 86], .09, .5)
    whoosh(S.T_FIN + .05, .6, 300, 7000, .7)
    for k in range(14): tick(S.T_FIN + .05 + k * .022, .5, 800 + 80 * k)
    thud(S.T_FIN + .55, 1.0); thud(S.T_FIN + .55, .4, 45)
    for tt, f in [(.9, 1500), (1.3, 1800), (1.875, 2100)]: tick(S.T_FIN + tt, .8, f); pop(S.T_FIN + tt, 600, .4)

def reverb(x):
    n = int(1.9 * SR); t = np.arange(n) / SR; ir = rng.normal(0, 1, (n, 2)).astype(np.float32) * np.exp(-t / .38)[:, None]
    ir = ir.copy(); ir[:int(.012 * SR)] = 0; out = np.zeros_like(x); L = len(x) + n
    for c in range(2):
        out[:, c] = np.fft.irfft(np.fft.rfft(x[:, c], L) * np.fft.rfft(ir[:, c], L), L)[:len(x)]
    return out * .045

def master(path):
    build()
    mix = dry + PADBUS * duck[:, None] + BASSBUS * duck[:, None] * 1.0 + 0
    wetb = wet + PADBUS * duck[:, None] * .25; mix = mix + reverb(wetb)
    mix[int(S.T_VAC * SR):int(S.T_VAC * SR)] = 0
    # vacuum gate: hush everything except the blip between 3.42 and 3.72 (leaves reverse swell + blip)
    a, b = int(3.40 * SR), int(3.75 * SR); g = np.ones(N, np.float32); g[a:b] = .0; mix = mix * g[:, None]
    put(mix, np.zeros(1, np.float32), 0)
    rs = np.zeros((N, 2), np.float32); put(rs, (fband(noise(.35), 1500, 12000) * np.linspace(0, 1, int(.35 * SR)) ** 3).astype(np.float32) * .35, 3.40); ping_rs = np.zeros((N, 2), np.float32)
    mix += rs
    for t0, f in [(3.52, 2637)]:
        s = (sine(f, .5) + .4 * sine(f * 2.005, .5)) * env(.5, .13, .001); put(mix, s * .2, t0, 1, 0)
    mix = np.tanh(mix * .5) / np.tanh(.5); fade = np.ones(N, np.float32); k = int(.5 * SR); fade[-k:] = np.linspace(1, 0, k) ** 1.5; mix *= fade[:, None]
    mix = mix / np.abs(mix).max() * .93
    pcm = (mix * 32767).astype(np.int16)
    with wave.open(path, "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

if __name__ == "__main__": master(sys.argv[1])
