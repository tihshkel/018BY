#!/usr/bin/env python3
"""Split a block PDF into per-page PDF files (one page each).

Usage:
  .venv/bin/python3 scripts/split-block-pdf-to-pages.py
  .venv/bin/python3 scripts/split-block-pdf-to-pages.py --album pregnancy_a5
"""

from __future__ import annotations

import argparse
import unicodedata
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]

ALBUM_CONFIGS = {
    "pregnancy_a5": {
        "block_pdf": ROOT / "in albums/Блок БЕРЕМЕННОСТЬ A5 другой блок.pdf",
        "output_dir": ROOT / "in albums/беременность A5",
        "max_page": 48,
    },
}


def normalize_path(path: Path) -> Path:
    if path.exists():
        return path
    parent = path.parent
    if not parent.exists():
        return path
    target_name = unicodedata.normalize("NFC", path.name)
    for child in parent.iterdir():
        if unicodedata.normalize("NFC", child.name) == target_name:
            return child
    return path


def split_block_pdf(block_pdf: Path, output_dir: Path, max_page: int) -> int:
    block_pdf = normalize_path(block_pdf)
    if not block_pdf.exists():
        raise FileNotFoundError(f"Block PDF not found: {block_pdf}")

    output_dir.mkdir(parents=True, exist_ok=True)
    source = fitz.open(block_pdf)
    page_count = min(max_page, source.page_count)
    written = 0

    for page_no in range(1, page_count + 1):
        out_doc = fitz.open()
        out_doc.insert_pdf(source, from_page=page_no - 1, to_page=page_no - 1)
        out_path = output_dir / f"{page_no:02d}.pdf"
        out_doc.save(out_path)
        out_doc.close()
        written += 1
        print(f"  page {page_no}/{page_count} -> {out_path.name}")

    source.close()
    return written


def main() -> None:
    parser = argparse.ArgumentParser(description="Split block PDF into per-page files")
    parser.add_argument(
        "--album",
        default="pregnancy_a5",
        choices=list(ALBUM_CONFIGS.keys()),
    )
    args = parser.parse_args()

    config = ALBUM_CONFIGS[args.album]
    print(f"Splitting {config['block_pdf'].name} -> {config['output_dir'].relative_to(ROOT)}")
    count = split_block_pdf(config["block_pdf"], config["output_dir"], config["max_page"])
    print(f"Done: {count} pages written")


if __name__ == "__main__":
    main()
