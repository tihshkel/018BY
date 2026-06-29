#!/usr/bin/env python3
"""Проверка: каждый используемый line-слот совпадает со штрихом в PDF."""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
TOLERANCE = float(os.environ.get("STROKE_TOLERANCE", "0.015"))

ALBUMS = {
    "diary_interior_brown": {
        "pdf": ROOT / "in albums/09.06.26_Блок коричневый _180х240_print.pdf",
        "manifest": ROOT / "scripts/diary-60-tz-manifest.json",
    },
    "diary_interior_purple": {
        "pdf": ROOT / "in albums/09.06.26_Блок фиолетовый_180х240_print.pdf",
        "manifest": ROOT / "scripts/girls-diary-a5-tz-manifest.json",
    },
}


def load_schemas() -> dict:
    raw = (ROOT / "constants/generated/album-page-schemas.ts").read_text(encoding="utf-8")
    match = re.search(r"export const ALBUM_PAGE_SCHEMAS[^=]*=\s*(\{[\s\S]*\})\s*as Record", raw)
    if not match:
        raise RuntimeError("Could not parse ALBUM_PAGE_SCHEMAS")
    return json.loads(match.group(1))


def load_line_slots() -> dict:
    return json.loads((ROOT / "constants/line-slots.json").read_text(encoding="utf-8"))


def pdf_stroke_ys(doc: fitz.Document, page_number: int) -> list[float]:
    page = doc[page_number - 1]
    w_page, h_page = page.rect.width, page.rect.height
    ys: set[float] = set()
    for drawing in page.get_drawings():
        rect = drawing["rect"]
        width = rect.width / w_page
        height = (rect.y1 - rect.y0) / h_page
        if width < 0.12 or height > 0.04:
            continue
        ys.add(round(rect.y1 / h_page, 4))
    return sorted(ys)


def nearest_stroke(strokes: list[float], y: float) -> float | None:
    if not strokes:
        return None
    return min(strokes, key=lambda stroke_y: abs(stroke_y - y))


def audit_album(album_id: str, config: dict, schemas: dict, line_slots: dict) -> list[dict]:
    manifest = json.loads(config["manifest"].read_text(encoding="utf-8"))
    doc = fitz.open(config["pdf"])
    failures: list[dict] = []

    for page_key, meta in manifest.items():
        if meta.get("pageType") != "structured" or not meta.get("editable"):
            continue
        page_number = int(page_key)
        schema = next(
            (s for s in schemas.get(album_id, []) if s.get("sourcePageNumber") == page_number),
            None,
        )
        if not schema:
            continue
        page_slots = line_slots.get(album_id, {}).get(page_key, [])
        strokes = pdf_stroke_ys(doc, page_number)

        for field in schema.get("fields", []):
            start = field.get("templateLineStart", 0)
            count = field.get("templateLineCount", 1)
            for slot_index in range(start, start + count):
                if slot_index >= len(page_slots):
                    failures.append(
                        {
                            "albumId": album_id,
                            "page": page_number,
                            "slotIndex": slot_index,
                            "fieldId": field.get("fieldId"),
                            "label": field.get("label"),
                            "code": "MISSING_SLOT",
                        }
                    )
                    continue
                slot = page_slots[slot_index]
                if slot.get("inputKind") == "block":
                    continue
                slot_y = slot["y"]
                nearest = nearest_stroke(strokes, slot_y)
                if nearest is None or abs(nearest - slot_y) > TOLERANCE:
                    failures.append(
                        {
                            "albumId": album_id,
                            "page": page_number,
                            "slotIndex": slot_index,
                            "slotY": slot_y,
                            "nearestStroke": nearest,
                            "fieldId": field.get("fieldId"),
                            "label": field.get("label"),
                            "code": "STROKE_MISMATCH",
                        }
                    )

    doc.close()
    return failures


def main() -> int:
    schemas = load_schemas()
    line_slots = load_line_slots()
    all_failures: list[dict] = []

    for album_id, config in ALBUMS.items():
        if not config["pdf"].exists():
            print(f"[audit-diary-stroke-alignment] skip {album_id}: PDF missing", file=sys.stderr)
            continue
        all_failures.extend(audit_album(album_id, config, schemas, line_slots))

    out_dir = ROOT / "test-results/diary-stroke-alignment"
    out_dir.mkdir(parents=True, exist_ok=True)
    report = {
        "generatedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "tolerance": TOLERANCE,
        "failureCount": len(all_failures),
        "failures": all_failures,
    }
    (out_dir / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    if all_failures:
        print(f"[audit-diary-stroke-alignment] FAIL: {len(all_failures)} line-slot mismatches")
        for item in all_failures[:25]:
            print(
                f"  {item['albumId']} p{item['page']} slot {item['slotIndex']} "
                f"{item['code']} ({item.get('label', '')})"
            )
        if os.environ.get("FAIL_ON_ERROR") == "1":
            return 1
    else:
        print("[audit-diary-stroke-alignment] OK: all line slots align with PDF strokes")

    print(f"Report: {out_dir / 'report.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
