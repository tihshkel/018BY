#!/usr/bin/env python3
"""Generate preview variant PNGs from designer PDFs for pregnancy_60 and kids_48.

Sources:
  in albums/беременность 180х240  -> pregnancy_60
  in albums/pdf new               -> kids_48

Outputs:
  assets/pdfs/.../preview_variants/{album}_variants_manifest.json + PNGs
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parents[1]
PHOTO_PAGES_PATH = ROOT / "constants/photo-pages-by-album.json"

ALBUM_CONFIGS = [
    {
        "album_id": "pregnancy_60",
        "source_dir": ROOT / "in albums/беременность 180х240",
        "output_dir": ROOT / "assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/preview_variants",
        "assets_prefix": "assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/preview_variants",
        "page_regex": re.compile(r"(\d{2})\s+бва\.pdf$", re.IGNORECASE),
        "variants_by_page_count": {
            1: ["one_large"],
            2: ["one_large", "two_photos"],
            4: ["one_large", "two_photos", "three_hero", "four_grid"],
        },
    },
    {
        "album_id": "kids_48",
        "source_dir": ROOT / "in albums/pdf new",
        "output_dir": ROOT / "assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/preview_variants",
        "assets_prefix": "assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/preview_variants",
        "page_regex": re.compile(r"Сва_(\d{2})\.pdf$", re.IGNORECASE),
        "variants_by_page_count": {
            1: ["one_horizontal"],
            2: ["one_horizontal", "two_horizontal"],
            4: [
                "one_horizontal",
                "two_horizontal",
                "two_vertical",
                "three_hero",
                "four_grid",
            ],
        },
        "extra_variants_by_page": {
            5: ["tree"],
        },
    },
]


def load_photo_pages() -> dict[str, list[int]]:
    if not PHOTO_PAGES_PATH.exists():
        print(f"Run: node scripts/export-photo-pages-manifest.js first", file=sys.stderr)
        sys.exit(1)
    data = json.loads(PHOTO_PAGES_PATH.read_text(encoding="utf-8"))
    return {k: [int(p) for p in v] for k, v in data.items()}


def page_no_from_name(file_name: str, pattern: re.Pattern[str]) -> int | None:
    match = pattern.search(file_name)
    if not match:
        return None
    return int(match.group(1))


def generate_album(config: dict, allowed_pages: set[int]) -> dict[str, dict[str, str]]:
    source_dir: Path = config["source_dir"]
    output_dir: Path = config["output_dir"]
    output_dir.mkdir(parents=True, exist_ok=True)

    manifest: dict[str, dict[str, str]] = {}
    if not source_dir.exists():
        print(f"Skip {config['album_id']}: missing {source_dir}")
        return manifest

    for pdf_path in sorted(source_dir.glob("*.pdf")):
        page_no = page_no_from_name(pdf_path.name, config["page_regex"])
        if page_no is None:
            continue
        if page_no not in allowed_pages:
            continue

        doc = fitz.open(pdf_path)
        variants = config["variants_by_page_count"].get(doc.page_count)
        if not variants:
            doc.close()
            continue

        manifest[str(page_no)] = {}
        clean_variant_id = variants[0]
        for index, variant_id in enumerate(variants):
            if index >= doc.page_count:
                # Collage variants share the same clean background (see pregnancy_60 script).
                source_index = min(doc.page_count - 1, 0)
                page = doc.load_page(source_index)
            else:
                page = doc.load_page(index)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            file_name = f"page_{page_no:03d}_{variant_id}.png"
            output_path = output_dir / file_name
            pix.save(output_path)
            manifest[str(page_no)][variant_id] = f"{config['assets_prefix']}/{file_name}"

        extra_variants = config.get("extra_variants_by_page", {}).get(page_no, [])
        if extra_variants and clean_variant_id in manifest[str(page_no)]:
            source_path = output_dir / f"page_{page_no:03d}_{clean_variant_id}.png"
            for variant_id in extra_variants:
                if variant_id in manifest[str(page_no)]:
                    continue
                target_path = output_dir / f"page_{page_no:03d}_{variant_id}.png"
                target_path.write_bytes(source_path.read_bytes())
                manifest[str(page_no)][variant_id] = (
                    f"{config['assets_prefix']}/{target_path.name}"
                )

        doc.close()

    manifest_name = f"{config['album_id']}_variants_manifest.json"
    manifest_path = output_dir / manifest_name
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"[{config['album_id']}] {len(manifest)} pages -> {manifest_path}")
    return manifest


def main() -> None:
    photo_pages = load_photo_pages()
    for config in ALBUM_CONFIGS:
        if config["album_id"] == "pregnancy_60":
            print("[pregnancy_60] use scripts/generate-pregnancy-preview-variants.py (block PDF)")
            continue
        if config["album_id"] == "kids_48":
            print("[kids_48] use scripts/generate-kids-48-preview-variants.py (block PDF)")
            continue
        allowed = set(photo_pages.get(config["album_id"], []))
        generate_album(config, allowed)


if __name__ == "__main__":
    main()
