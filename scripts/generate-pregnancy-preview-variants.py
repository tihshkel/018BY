#!/usr/bin/env python3
"""Generate preview variant PNGs for pregnancy_60 from PDFs.

Source folder:
  in albums/беременность 180х240

Output folder:
  assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/preview_variants
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "in albums/беременность 180х240"
OUTPUT_DIR = ROOT / "assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/preview_variants"
MANIFEST_PATH = OUTPUT_DIR / "pregnancy_60_variants_manifest.json"

VARIANTS_BY_PAGE_COUNT = {
    1: ["one_large"],
    2: ["one_large", "two_photos"],
    4: ["one_large", "two_photos", "three_hero", "four_grid"],
}


def page_no_from_name(file_name: str) -> int | None:
    match = re.search(r"(\d{2})\s+бва\.pdf$", file_name)
    if not match:
        return None
    return int(match.group(1))


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    manifest: dict[str, dict[str, str]] = {}
    pdf_files = sorted(SOURCE_DIR.glob("*.pdf"))

    for pdf_path in pdf_files:
        page_no = page_no_from_name(pdf_path.name)
        if page_no is None:
            continue

        doc = fitz.open(pdf_path)
        variants = VARIANTS_BY_PAGE_COUNT.get(doc.page_count)
        if not variants:
            doc.close()
            continue

        manifest[str(page_no)] = {}
        for index, variant_id in enumerate(variants):
            page = doc.load_page(index)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            file_name = f"page_{page_no:03d}_{variant_id}.png"
            output_path = OUTPUT_DIR / file_name
            pix.save(output_path)
            manifest[str(page_no)][variant_id] = (
                f"assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/preview_variants/{file_name}"
            )

        doc.close()

    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Generated variants for {len(manifest)} pages")
    print(f"Manifest: {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
