#!/usr/bin/env python3
"""Render designer PDF pages as layout preview PNGs (shows photo zones + text).

Sources:
  in albums/беременность 180х240  -> pregnancy_60 (all 60 pages)
  in albums/pdf new               -> kids_48 (all 48 pages)

Outputs:
  assets/pdfs/.../design_previews/{album}_design_manifest.json + page_NNN_design.png
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parents[1]

ALBUM_CONFIGS = [
    {
        "album_id": "pregnancy_60",
        "page_count": 60,
        "source_dir": ROOT / "in albums/беременность 180х240",
        "output_dir": ROOT / "assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/design_previews",
        "assets_prefix": "assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/design_previews",
        "page_regex": re.compile(r"(\d{2})\s+бва\.pdf$", re.IGNORECASE),
    },
    {
        "album_id": "kids_48",
        "page_count": 48,
        "source_dir": ROOT / "in albums/pdf new",
        "output_dir": ROOT / "assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/design_previews",
        "assets_prefix": "assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/design_previews",
        "page_regex": re.compile(r"Сва_(\d{2})\.pdf$", re.IGNORECASE),
    },
]

RENDER_MATRIX = fitz.Matrix(2, 2)


def page_no_from_name(file_name: str, pattern: re.Pattern[str]) -> int | None:
    match = pattern.search(file_name)
    if not match:
        return None
    return int(match.group(1))


def generate_album(config: dict) -> dict[str, str]:
    source_dir: Path = config["source_dir"]
    output_dir: Path = config["output_dir"]
    output_dir.mkdir(parents=True, exist_ok=True)

    manifest: dict[str, str] = {}
    if not source_dir.exists():
        print(f"Skip {config['album_id']}: missing {source_dir}", file=sys.stderr)
        return manifest

    for pdf_path in sorted(source_dir.glob("*.pdf")):
        page_no = page_no_from_name(pdf_path.name, config["page_regex"])
        if page_no is None or page_no < 1 or page_no > config["page_count"]:
            continue

        doc = fitz.open(pdf_path)
        page = doc.load_page(0)
        pix = page.get_pixmap(matrix=RENDER_MATRIX, alpha=False)
        file_name = f"page_{page_no:03d}_design.png"
        output_path = output_dir / file_name
        pix.save(output_path)
        manifest[str(page_no)] = f"{config['assets_prefix']}/{file_name}"
        doc.close()

    manifest_name = f"{config['album_id']}_design_manifest.json"
    manifest_path = output_dir / manifest_name
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"[{config['album_id']}] {len(manifest)}/{config['page_count']} pages -> {manifest_path}")
    return manifest


def main() -> None:
    for config in ALBUM_CONFIGS:
        generate_album(config)


if __name__ == "__main__":
    main()
