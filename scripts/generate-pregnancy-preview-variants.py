#!/usr/bin/env python3
"""Generate clean preview variant PNGs for pregnancy_60 from the block PDF.

The combined block PDF (in albums/Блок БЕРЕМЕННОСТЬ 60 стр.pdf) already contains
design pages without «Место для фото» placeholders. Per-page PDFs in
in albums/беременность 180х240 are layout previews WITH placeholders — do not use them here.

Output:
  assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/preview_variants/page_NNN_{variant}.png
  assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/preview_variants/pregnancy_60_variants_manifest.json
"""

from __future__ import annotations

import json
import unicodedata
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parents[1]
BLOCK_PDF = ROOT / "in albums/Блок БЕРЕМЕННОСТЬ 60 стр.pdf"
OUTPUT_DIR = ROOT / "assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/preview_variants"
MANIFEST_PATH = OUTPUT_DIR / "pregnancy_60_variants_manifest.json"
ASSETS_PREFIX = "assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/preview_variants"

RENDER_MATRIX = fitz.Matrix(2, 2)

# Collage pages share one clean block-PDF background for every variant id.
MULTI_VARIANT_PAGES: dict[int, list[str]] = {
    54: ["one_large", "two_photos"],
    55: ["one_large", "two_photos", "three_hero", "four_grid"],
    56: ["one_large", "two_photos", "three_hero", "four_grid"],
    57: ["one_large", "two_photos", "three_hero", "four_grid"],
    58: ["one_large", "two_photos", "three_hero", "four_grid"],
    59: ["one_large", "two_photos", "three_hero", "four_grid"],
}


def normalize_path(path: Path) -> Path:
    if path.exists():
        return path
    parent = path.parent
    if not parent.exists():
        return path
    target = unicodedata.normalize("NFC", path.name)
    for child in parent.iterdir():
        if unicodedata.normalize("NFC", child.name) == target:
            return child
    return path


def main() -> None:
    block_pdf = normalize_path(BLOCK_PDF)
    if not block_pdf.exists():
        raise FileNotFoundError(f"Block PDF not found: {block_pdf}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(block_pdf)
    manifest: dict[str, dict[str, str]] = {}

    for page_no in range(1, doc.page_count + 1):
        page = doc.load_page(page_no - 1)
        pix = page.get_pixmap(matrix=RENDER_MATRIX, alpha=False)

        variant_ids = MULTI_VARIANT_PAGES.get(page_no, ["one_large"])
        manifest[str(page_no)] = {}

        for variant_id in variant_ids:
            file_name = f"page_{page_no:03d}_{variant_id}.png"
            output_path = OUTPUT_DIR / file_name
            pix.save(output_path)
            manifest[str(page_no)][variant_id] = f"{ASSETS_PREFIX}/{file_name}"

    doc.close()

    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Generated clean variants for {len(manifest)} pages from {block_pdf.name}")
    print(f"Manifest: {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
