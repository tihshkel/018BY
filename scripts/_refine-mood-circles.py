"""Precise mood ring centers via circular ink edges on purple page_009."""
from __future__ import annotations

from PIL import Image
import numpy as np

PNG = r"albums/diary/cover/in album/Блок фиолетовый_180х240_print/page_009.png"


def main() -> None:
    im = Image.open(PNG).convert("RGB")
    arr = np.asarray(im).astype(np.float32)
    h, w = arr.shape[:2]
    gray = arr.mean(axis=2)

    # Mood strip
    y0, y1 = int(0.575 * h), int(0.650 * h)
    x0, x1 = int(0.10 * w), int(0.75 * w)
    band = gray[y0:y1, x0:x1]
    # Purple ink is darker than cream bg (~240+)
    ink = band < 150

    # Approximate 9 centers from column clusters
    proj = ink.mean(axis=0)
    k = np.ones(21) / 21
    proj = np.convolve(proj, k, mode="same")
    thr = proj.max() * 0.28
    active = proj > thr
    clusters = []
    in_c = False
    for i, a in enumerate(active):
        if a and not in_c:
            start = i
            in_c = True
        elif not a and in_c:
            clusters.append((start, i))
            in_c = False
    if in_c:
        clusters.append((start, len(active)))

    results = []
    for a, b in clusters:
        width = b - a
        if width < 50 or width > 160:
            continue
        # Local window
        pad = 8
        xa, xb = max(0, a - pad), min(band.shape[1], b + pad)
        local = ink[:, xa:xb]
        # Distance transform style: for each pixel, find ring by edge of disk
        # Use moments of ink for center
        ys, xs = np.where(local)
        if len(xs) < 30:
            continue
        cx_local = xs.mean()
        cy_local = ys.mean()
        # Refine: only use outer ring pixels (far from local center)
        dx = xs - cx_local
        dy = ys - cy_local
        dist = np.sqrt(dx * dx + dy * dy)
        # Keep mid-outer annulus
        r_med = np.median(dist)
        mask = (dist > r_med * 0.55) & (dist < r_med * 1.35)
        if mask.sum() < 20:
            mask = dist > 0
        cx_local = xs[mask].mean()
        cy_local = ys[mask].mean()
        dx = xs[mask] - cx_local
        dy = ys[mask] - cy_local
        radius = np.median(np.sqrt(dx * dx + dy * dy))

        cx = (x0 + xa + cx_local) / w
        cy = (y0 + cy_local) / h
        diameter = (2 * radius) / w
        results.append((cx, cy, diameter, width, radius))

    # Deduplicate close peaks
    results.sort(key=lambda t: t[0])
    filtered = []
    for r in results:
        if not filtered or r[0] - filtered[-1][0] > 0.04:
            filtered.append(r)
        elif r[2] > filtered[-1][2]:
            filtered[-1] = r

    print(f"found {len(filtered)}")
    for i, (cx, cy, d, width, radius) in enumerate(filtered):
        print(
            f"  [{i}] cx={cx:.4f} cy={cy:.4f} diameter={d:.4f} "
            f"rPx={radius:.1f} clusterW={width}"
        )

    print("\nJS snippet:")
    print("const PURPLE_MOOD_CIRCLE_COORDS = [")
    for cx, cy, d, *_ in filtered:
        print(f"  {{ cx: {cx:.4f}, cy: {cy:.4f}, diameter: {d:.4f} }},")
    print("];")


if __name__ == "__main__":
    main()
