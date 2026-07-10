#!/usr/bin/env python3
"""Generate clean preview variant PNGs for kids_48 from the block PDF.

The combined block PDF (in albums/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр.pdf) contains
design pages without «Место для фото» placeholders. Per-page PDFs in
in albums/pdf new are layout previews WITH placeholders — do not use them here.

Output:
  assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/preview_variants/page_NNN_{variant}.png
  assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/preview_variants/kids_48_variants_manifest.json
"""

from __future__ import annotations

import json
import unicodedata
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parents[1]
BLOCK_PDF = ROOT / "in albums/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр.pdf"
OUTPUT_DIR = ROOT / "assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/preview_variants"
MANIFEST_PATH = OUTPUT_DIR / "kids_48_variants_manifest.json"
PHOTO_PAGES_PATH = ROOT / "constants/photo-pages-by-album.json"
ASSETS_PREFIX = "assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/preview_variants"

RENDER_MATRIX = fitz.Matrix(2, 2)


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


def load_photo_pages() -> list[int]:
    data = json.loads(PHOTO_PAGES_PATH.read_text(encoding="utf-8"))
    return [int(p) for p in data["kids_48"]]


def load_variant_keys_by_page() -> dict[str, list[str]]:
    if not MANIFEST_PATH.exists():
        raise FileNotFoundError(
            f"Existing manifest required for variant keys: {MANIFEST_PATH}"
        )
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    return {page: list(variants.keys()) for page, variants in manifest.items()}


def main() -> None:
    block_pdf = normalize_path(BLOCK_PDF)
    if not block_pdf.exists():
        raise FileNotFoundError(f"Block PDF not found: {block_pdf}")

    photo_pages = load_photo_pages()
    variant_keys_by_page = load_variant_keys_by_page()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(block_pdf)
    manifest: dict[str, dict[str, str]] = {}
    png_count = 0

    for page_no in photo_pages:
        if page_no < 1 or page_no > doc.page_count:
            print(f"WARN: page {page_no} out of range (PDF has {doc.page_count} pages)")
            continue

        page_key = str(page_no)
        variant_ids = variant_keys_by_page.get(page_key)
        if not variant_ids:
            print(f"WARN: page {page_no} missing from manifest — skip")
            continue

        page = doc.load_page(page_no - 1)
        pix = page.get_pixmap(matrix=RENDER_MATRIX, alpha=False)
        manifest[page_key] = {}

        for variant_id in variant_ids:
            file_name = f"page_{page_no:03d}_{variant_id}.png"
            output_path = OUTPUT_DIR / file_name
            pix.save(output_path)
            manifest[page_key][variant_id] = f"{ASSETS_PREFIX}/{file_name}"
            png_count += 1

    doc.close()

    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        f"Generated {png_count} clean variant PNGs for {len(manifest)} photo pages "
        f"from {block_pdf.name}"
    )
    print(f"Manifest: {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
