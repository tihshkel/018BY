#!/usr/bin/env python3
"""
Extract travel-map assets from birthday page 40 PDF.

Findings (holidays 21×21 PDF):
- Map is mostly ONE compound vector path (all borders), not per-country layers.
- ~8–18 separate fill regions are islands/small areas — not full country set.
- For tap-to-fill per country, prefer designer SVG export OR aligned Natural Earth SVG.

Outputs:
  assets/travel-map/map-background.png   — cropped map for editor background
  assets/travel-map/regions.json         — clickable paths (partial, from PDF fills)
  assets/travel-map/meta.json            — normalized bounds + viewBox

Usage:
  .venv/bin/python3 scripts/extract-travel-map-from-pdf.py
"""

from __future__ import annotations

import json
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PDF = ROOT / "in albums/pdf new/БЃеЃ_210е210_Сва_40.pdf"
OUT_DIR = ROOT / "assets/travel-map"

# Land fill colors in designer PDF (RGB 0–1)
LAND_FILL_COLORS = {
    (0.899, 0.892, 0.871),  # beige continents
    (0.735, 0.743, 0.751),  # gray land
    (0.570, 0.507, 0.512),  # brown accents
}

VIEWBOX = 1000


def round_color(fill: tuple[float, float, float]) -> tuple[float, float, float]:
    return tuple(round(c, 3) for c in fill)


def items_to_path_d(
    items: list,
    origin_x: float,
    origin_y: float,
    scale: float,
) -> str:
    parts: list[str] = []
    for item in items:
        op = item[0]
        if op == "m":
            x, y = item[1].x, item[1].y
            parts.append(f"M{(x - origin_x) * scale:.3f},{(y - origin_y) * scale:.3f}")
        elif op == "l":
            x, y = item[1].x, item[1].y
            parts.append(f"L{(x - origin_x) * scale:.3f},{(y - origin_y) * scale:.3f}")
        elif op == "c":
            coords = []
            for p in item[1:]:
                coords.append(f"{(p.x - origin_x) * scale:.3f},{(p.y - origin_y) * scale:.3f}")
            parts.append("C" + ",".join(coords))
        elif op == "re":
            r = item[1]
            x0, y0, x1, y1 = r.x0, r.y0, r.x1, r.y1
            parts.append(
                f"M{(x0 - origin_x) * scale:.3f},{(y0 - origin_y) * scale:.3f}"
                f"L{(x1 - origin_x) * scale:.3f},{(y0 - origin_y) * scale:.3f}"
                f"L{(x1 - origin_x) * scale:.3f},{(y1 - origin_y) * scale:.3f}"
                f"L{(x0 - origin_x) * scale:.3f},{(y1 - origin_y) * scale:.3f}Z"
            )
        elif op == "h":
            parts.append("Z")
    return "".join(parts)


def detect_map_bounds(page: fitz.Page, margin: float = 0.02) -> fitz.Rect:
    w, h = page.rect.width, page.rect.height
    land_rects: list[fitz.Rect] = []
    for drawing in page.get_drawings():
        fill = drawing.get("fill")
        if not fill or round_color(fill) not in LAND_FILL_COLORS:
            continue
        if len(drawing.get("items", [])) > 200:
            # Skip compound world silhouette — use separate regions for hits
            continue
        land_rects.append(drawing["rect"])

    if not land_rects:
        return fitz.Rect(0.055 * w, 0.155 * h, 0.945 * w, 0.70 * h)

    x0 = min(r.x0 for r in land_rects)
    y0 = min(r.y0 for r in land_rects)
    x1 = max(r.x1 for r in land_rects)
    y1 = max(r.y1 for r in land_rects)
    pad_x = (x1 - x0) * margin
    pad_y = (y1 - y0) * margin
    return fitz.Rect(
        max(0, x0 - pad_x),
        max(0, y0 - pad_y),
        min(w, x1 + pad_x),
        min(h, y1 + pad_y),
    )


def extract_regions(page: fitz.Page, bounds: fitz.Rect) -> list[dict]:
    scale = VIEWBOX / max(bounds.width, bounds.height)
    regions: list[dict] = []
    idx = 0

    for drawing in page.get_drawings():
        fill = drawing.get("fill")
        if not fill or round_color(fill) not in LAND_FILL_COLORS:
            continue
        rect = drawing["rect"]
        if rect.x1 < bounds.x0 or rect.x0 > bounds.x1:
            continue
        if rect.y1 < bounds.y0 or rect.y0 > bounds.y1:
            continue
        if len(drawing.get("items", [])) > 200:
            continue

        idx += 1
        d = items_to_path_d(drawing["items"], bounds.x0, bounds.y0, scale)
        cx = (rect.x0 + rect.x1) / 2 - bounds.x0
        cy = (rect.y0 + rect.y1) / 2 - bounds.y0
        regions.append(
            {
                "id": f"region_{idx:02d}",
                "d": d,
                "label": f"Регион {idx}",
                "cx": round(cx * scale, 1),
                "cy": round(cy * scale, 1),
                "fillColor": list(round_color(fill)),
            }
        )

    return regions


def main() -> None:
    pdf_path = DEFAULT_PDF
    if not pdf_path.exists():
        raise SystemExit(f"PDF not found: {pdf_path}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf_path)
    page = doc[0]
    w, h = page.rect.width, page.rect.height

    bounds = detect_map_bounds(page)
    norm = {
        "x": round(bounds.x0 / w, 4),
        "y": round(bounds.y0 / h, 4),
        "width": round(bounds.width / w, 4),
        "height": round(bounds.height / h, 4),
    }

    regions = extract_regions(page, bounds)
    meta = {
        "sourcePdf": str(pdf_path.relative_to(ROOT)),
        "pageSize": [w, h],
        "boundsPdf": [bounds.x0, bounds.y0, bounds.x1, bounds.y1],
        "boundsNorm": norm,
        "viewBox": [VIEWBOX, VIEWBOX],
        "regionCount": len(regions),
        "note": (
            "PDF does not contain one path per country. "
            "For full country picker, add designer SVG or aligned world-atlas dataset."
        ),
    }

    # High-res crop for editor background
    zoom = 3
    mat = fitz.Matrix(zoom, zoom)
    clip = bounds
    pix = page.get_pixmap(matrix=mat, clip=clip, alpha=False)
    bg_path = OUT_DIR / "map-background.png"
    pix.save(str(bg_path))

    (OUT_DIR / "regions.json").write_text(
        json.dumps({"viewBox": meta["viewBox"], "regions": regions}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (OUT_DIR / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Wrote {bg_path}")
    print(f"Regions: {len(regions)} (partial — not all countries)")
    print(f"Normalized bounds: {norm}")


if __name__ == "__main__":
    main()
