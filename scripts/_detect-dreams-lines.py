"""Detect white ruling lines on diary brown p15 (Мечты) PNG."""
from __future__ import annotations

from PIL import Image
import numpy as np

PNG = r"albums/diary/cover/in album/Блок коричневый _180х240_print/page_015.png"


def find_white_lines(arr: np.ndarray, x0: int, x1: int, y0: int, y1: int, score_thr: float = 0.28):
    region = arr[y0:y1, x0:x1].astype(np.float32)
    r, g, b = region[:, :, 0], region[:, :, 1], region[:, :, 2]
    mn = np.minimum(np.minimum(r, g), b)
    # White stroke on peach: near-white and channels close.
    white = (mn > 225) & (np.abs(r - g) < 30) & (np.abs(g - b) < 30) & (np.abs(r - b) < 35)
    white_row = white.mean(axis=1)
    ys = [(y0 + i, float(score)) for i, score in enumerate(white_row) if score > score_thr]
    if not ys:
        return []
    clusters: list[list[tuple[int, float]]] = []
    cur = [ys[0]]
    for p in ys[1:]:
        if p[0] - cur[-1][0] <= 4:
            cur.append(p)
        else:
            clusters.append(cur)
            cur = [p]
    clusters.append(cur)
    h = arr.shape[0]
    out = []
    for c in clusters:
        best = max(c, key=lambda t: t[1])
        cy = sum(t[0] for t in c) / len(c)
        out.append(
            {
                "yNorm": round(cy / h, 5),
                "yPx": round(cy, 1),
                "thick": len(c),
                "score": round(best[1], 3),
            }
        )
    return out


def main() -> None:
    im = Image.open(PNG).convert("RGB")
    arr = np.asarray(im)
    h, w = arr.shape[:2]
    print(f"size {w}x{h}")

    left_boxes = [
        (int(0.12 * w), int(0.50 * w), int(0.17 * h), int(0.37 * h)),
        (int(0.12 * w), int(0.50 * w), int(0.35 * h), int(0.55 * h)),
        (int(0.12 * w), int(0.50 * w), int(0.53 * h), int(0.80 * h)),
    ]
    right_box = (int(0.52 * w), int(0.90 * w), int(0.17 * h), int(0.80 * h))
    bottom_box = (int(0.12 * w), int(0.65 * w), int(0.82 * h), int(0.96 * h))

    print("\nLEFT boxes:")
    all_left = []
    for i, box in enumerate(left_boxes):
        lines = find_white_lines(arr, *box)
        print(f" box{i + 1} lines={len(lines)}")
        for line in lines:
            print(f"   {line}")
            all_left.append(line["yNorm"])

    print("\nRIGHT:")
    right = find_white_lines(arr, *right_box, score_thr=0.22)
    print(f" lines={len(right)}")
    for line in right:
        print(f"   {line}")

    print("\nBOTTOM:")
    bottom = find_white_lines(arr, *bottom_box, score_thr=0.22)
    print(f" lines={len(bottom)}")
    for line in bottom:
        print(f"   {line}")

    print("\nCURRENT SLOTS (line-slots.json):")
    import json
    from pathlib import Path

    slots = json.loads(Path("constants/line-slots.json").read_text(encoding="utf-8"))[
        "diary_interior_brown"
    ]["15"]
    for i, s in enumerate(slots):
        print(f"  [{i:02d}] y={s['y']:.5f} x={s['x']:.4f} w={s['width']:.4f} g={s.get('continuationGroup')}")

    print("\nSUGGESTED ordered left+right+bottom yNorm:")
    suggested = sorted(set(round(y, 5) for y in all_left + [r["yNorm"] for r in right] + [b["yNorm"] for b in bottom]))
    for y in suggested:
        print(f"  {y:.5f}")


if __name__ == "__main__":
    main()
