"""고민 동물 그림 다듬기: 선을 또렷하고 진하게, 가장자리를 매끈하게.

쓰는 법:  python3 web/scripts/mascot-ink.py <원본 폴더> <결과 폴더> [--eyes 모양]
원본은 배경이 투명한 그림(webp/png). 결과는 3배 크기의 webp.
"""
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

S = 4                 # 작업 배율
OUT = 3               # 저장 배율
INK = np.array([38, 27, 19], float)   # 선 색 (짙은 갈색)
LINE_LUM = 0.30       # 이보다 어두우면 선
GROW = 0.55           # 선을 양쪽으로 키우는 정도 (원본 픽셀)
RING = 3.4            # 바깥 선 두께 (원본 픽셀)
SPECK = 14            # 이보다 작은 점(원본 픽셀 넓이)은 얼룩으로 보고 지움
CUT = 4.2             # 가장자리에서 걷어낼 두께 (원본 픽셀)


def smooth(x, lo, hi):
    t = np.clip((x - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


def load(path):
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    pad = 6
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    canvas.paste(im, (pad, pad))
    a = np.asarray(canvas).astype(float) / 255
    pre = a.copy()
    pre[..., :3] *= a[..., 3:4]
    up = np.asarray(Image.fromarray((pre * 255).astype(np.uint8), "RGBA").resize((canvas.width * S, canvas.height * S), Image.BICUBIC)).astype(float) / 255
    alpha = up[..., 3]
    rgb = up[..., :3] / np.maximum(alpha[..., None], 1e-3)
    return np.clip(rgb, 0, 1), alpha


def analyse(path):
    rgb, alpha = load(path)
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    lum = np.where(alpha > 0.5, lum, 1.0)

    # 몸 모양: 덧댄 바깥 선(지글지글한 겹선)을 걷어내고 가장자리를 매끈하게
    d0 = ndi.distance_transform_edt(ndi.gaussian_filter(alpha, S * 0.6) > 0.5)
    sil_f = ndi.gaussian_filter((d0 > CUT * S).astype(float), S * 1.6)
    sil_f = ndi.gaussian_filter((sil_f > 0.5).astype(float), S * 0.4)
    sil = sil_f > 0.5
    lum = np.where(sil, lum, 1.0)

    # 선: 어두운 부분을 모아 매끈하게, 조금 굵게
    # (1) 아주 어두운 곳  (2) 주변보다 뚜렷하게 어두운 가는 획 (연한 선도 놓치지 않게)
    k = int(S * 9) | 1
    tophat = ndi.grey_closing(lum, size=(k, k)) - lum
    dark = np.maximum(smooth(LINE_LUM + 0.05 - lum, 0, 0.1), smooth(tophat, 0.16, 0.30) * (lum < 0.6))
    line_f = ndi.gaussian_filter(dark, S * 0.9)
    # 원본에 섞여 있던 깨알 같은 얼룩은 지움
    lab0, n0 = ndi.label(line_f > 0.4)
    if n0:
        area = ndi.sum(np.ones_like(lab0), lab0, np.arange(1, n0 + 1))
        small = np.isin(lab0, 1 + np.nonzero(area < SPECK * S * S)[0])
        line_f = np.where(ndi.binary_dilation(small, iterations=S), 0.0, line_f)
    line_core = line_f > 0.5
    thr = 0.5 - GROW * 0.28
    line_soft = smooth(line_f, thr - 0.06, thr + 0.06)

    # 바깥 선: 몸 모양 가장자리에 일정한 두께로
    dist_in = ndi.distance_transform_edt(sil)
    ring_soft = smooth(RING * S - dist_in, -S * 0.3, S * 0.3) * smooth(sil_f, 0.4, 0.6)

    return dict(rgb=rgb, alpha=alpha, sil=sil, sil_f=sil_f, line_core=line_core, line_f=line_f, line_soft=line_soft, ring_soft=ring_soft, dist_in=dist_in, thr=thr)


def find_eyes(A):
    """작고 동그란 검은 점 두 개 = 눈"""
    lab, n = ndi.label(A["line_core"])
    out = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        hh, ww = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        area = (lab[sl] == i).sum()
        d = (hh + ww) / 2 / S
        if not (3.0 <= d <= 16) or not (0.6 <= hh / ww <= 1.7):
            continue
        if area / (hh * ww) < 0.62:
            continue
        cy, cx = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2
        if A["dist_in"][int(cy), int(cx)] < S * 8:
            continue
        out.append(dict(i=i, cx=cx, cy=cy, r=(area / np.pi) ** 0.5, h=hh, w=ww))
    best = None
    for a in range(len(out)):
        for b in range(a + 1, len(out)):
            p, q = out[a], out[b]
            dx, dy = abs(p["cx"] - q["cx"]), abs(p["cy"] - q["cy"])
            if dx < S * 14 or dy > dx * 0.35:
                continue
            score = abs(p["r"] - q["r"]) / max(p["r"], q["r"]) + dy / dx + (p["cy"] + q["cy"]) / (2 * A["sil"].shape[0])
            if best is None or score < best[0]:
                best = (score, p, q)
    if not best:
        return None, lab
    p, q = sorted(best[1:], key=lambda e: e["cx"])
    return (p, q), lab


def clean_base(A, extra_hide=None):
    """선 밑과 선 옆 번진 부분을 주변 색으로 메운 바탕"""
    rgb = A["rgb"]
    hide = A["line_f"] > 0.12
    if extra_hide is not None:
        hide |= extra_hide
    ok = A["sil"] & ~hide & (A["dist_in"] > RING * S * 0.9)
    base = rgb.copy()
    todo = ~ok
    for sig in (S * 1.2, S * 3, S * 8, S * 20):
        if not todo.any():
            break
        w = ndi.gaussian_filter(ok.astype(float), sig)
        num = np.stack([ndi.gaussian_filter(rgb[..., c] * ok, sig) for c in range(3)], -1)
        fill = num / np.maximum(w[..., None], 1e-6)
        take = todo & (w > 0.02)
        base[take] = fill[take]
        todo &= ~take
    return base


def draw_eyes(shape, eyes, style):
    """새 눈을 그려서 (검은 부분, 흰 부분) 돌려줌"""
    H, W = shape
    ink = Image.new("L", (W, H), 0)
    white = Image.new("L", (W, H), 0)
    di, dw = ImageDraw.Draw(ink), ImageDraw.Draw(white)
    r0 = (eyes[0]["r"] + eyes[1]["r"]) / 2
    for e in eyes:
        x, y = e["cx"], e["cy"]
        if style == "dot":          # 지금보다 조금 큰 점 눈
            r = r0 * 1.18
            di.ellipse([x - r, y - r, x + r, y + r], fill=255)
        elif style == "shine":      # 큰 점 눈 + 반짝
            r = r0 * 1.45
            di.ellipse([x - r, y - r, x + r, y + r], fill=255)
            h = r * 0.36
            dw.ellipse([x - r * 0.42 - h, y - r * 0.42 - h, x - r * 0.42 + h, y - r * 0.42 + h], fill=255)
        elif style == "oval":       # 세로로 긴 눈
            rx, ry = r0 * 1.0, r0 * 1.6
            di.ellipse([x - rx, y - ry, x + rx, y + ry], fill=255)
            h = rx * 0.38
            dw.ellipse([x - rx * 0.3 - h, y - ry * 0.5 - h, x - rx * 0.3 + h, y - ry * 0.5 + h], fill=255)
        elif style == "white":      # 흰자 + 작은 눈동자
            r = r0 * 2.4
            di.ellipse([x - r, y - r, x + r, y + r], fill=255)
            ri = r - S * 2.3
            dw.ellipse([x - ri, y - ri, x + ri, y + ri], fill=255)
        elif style == "smile":      # 웃는 반달 눈
            r = r0 * 2.1
            wd = int(S * 3.3)
            di.arc([x - r, y - r * 0.7, x + r, y + r * 1.5], 200, 340, fill=255, width=wd)
            for ang in (200, 340):
                ex = x + r * np.cos(np.radians(ang)); ey = y + r * 0.4 + r * 1.1 * np.sin(np.radians(ang))
                di.ellipse([ex - wd / 2, ey - wd / 2, ex + wd / 2, ey + wd / 2], fill=255)
        elif style == "flat":       # 무심한 일자 눈
            r = r0 * 1.9
            wd = S * 3.3
            di.rounded_rectangle([x - r, y - wd / 2, x + r, y + wd / 2], radius=wd / 2, fill=255)
    if style == "white":
        pup = Image.new("L", (W, H), 0)
        dp = ImageDraw.Draw(pup)
        for e in eyes:
            r = r0 * 0.8
            dp.ellipse([e["cx"] - r, e["cy"] - r, e["cx"] + r, e["cy"] + r], fill=255)
        return np.asarray(ink) / 255, np.asarray(white) / 255, np.asarray(pup) / 255
    return np.asarray(ink) / 255, np.asarray(white) / 255, None


def render(path, eye_style=None, cache=None):
    if cache is not None and "A" in cache:
        A, eyes, lab = cache["A"], cache["eyes"], cache["lab"]
    else:
        A = analyse(path)
        eyes, lab = find_eyes(A)
        if cache is not None:
            cache.update(A=A, eyes=eyes, lab=lab)
    line = A["line_soft"].copy()
    hide = None
    new = None
    if eye_style and eyes:
        em = np.isin(lab, [eyes[0]["i"], eyes[1]["i"]])
        em = ndi.binary_dilation(em, iterations=int(S * 2.2))
        line = line * (1 - ndi.gaussian_filter(em.astype(float), S * 0.3))
        hide = em
        new = draw_eyes(A["sil"].shape, eyes, eye_style)
    base = clean_base(A, hide)
    L = np.maximum(line, A["ring_soft"])
    out = base * (1 - L[..., None]) + (INK / 255) * L[..., None]
    if new:
        k, wh, pup = new
        out = out * (1 - k[..., None]) + (INK / 255) * k[..., None]
        out = out * (1 - wh[..., None]) + np.array([1.0, 0.99, 0.96]) * wh[..., None]
        if pup is not None:
            out = out * (1 - pup[..., None]) + (INK / 255) * pup[..., None]
    alpha = smooth(A["sil_f"], 0.42, 0.58)
    rgba = np.dstack([out, alpha])
    im = Image.fromarray((np.clip(rgba, 0, 1) * 255).astype(np.uint8), "RGBA")
    im = im.resize((im.width * OUT // S, im.height * OUT // S), Image.LANCZOS)
    box = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    return im.crop(box), eyes


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    style = sys.argv[sys.argv.index("--eyes") + 1] if "--eyes" in sys.argv else None
    only = sys.argv[sys.argv.index("--only") + 1].split(",") if "--only" in sys.argv else None
    os.makedirs(dst, exist_ok=True)
    for f in sorted(os.listdir(src)):
        name, ext = os.path.splitext(f)
        if ext.lower() not in (".webp", ".png") or (only and name not in only):
            continue
        cache = {}
        for st in (style.split(",") if style else [None]):
            out = os.path.join(dst, st) if style and "," in style else dst
            os.makedirs(out, exist_ok=True)
            im, eyes = render(os.path.join(src, f), st, cache)
            im.save(os.path.join(out, name + ".webp"), "WEBP", quality=92, method=6)
        print(name, im.size, "눈 찾음" if eyes else "눈 못 찾음", flush=True)
