#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Конвертирует блоки дневников (коричневый / фиолетовый) из PDF в PNG page_XXX.png.

Источник: in albums/06.26_*.pdf
Назначение: albums/diary/cover/in album/<имя блока>/
Дополнительно (опционально): assets/pdfs/<имя блока>/ — для единообразия с альбомами беременности.

После конвертации: npm run generate:diary-interior-assets
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Ошибка: PyMuPDF не установлен. Установите: pip install PyMuPDF")
    sys.exit(1)

# PDF в in albums → стабильные имена папок в приложении (без префикса 06.26_)
DIARY_BLOCKS = [
    {
        "pdf": "06.26_Блок коричневый _180х240_print.pdf",
        "folder": "Блок коричневый _180х240_print",
    },
    {
        "pdf": "06.26_Блок фиолетовый_180х240_print.pdf",
        "folder": "Блок фиолетовый_180х240_print",
    },
]


def find_pdf_in_dir(directory: Path, basename: str) -> Path | None:
    """Находит PDF по точному имени или по подстроке (NFC/NFD на macOS)."""
    exact = directory / basename
    if exact.exists():
        return exact
    key = basename.replace("06.26_", "").lower()
    for p in directory.glob("*.pdf"):
        if key in p.name.lower() or basename.lower() in p.name.lower():
            return p
    return None


def extract_pdf_pages(pdf_path: Path, output_dir: Path, dpi: int = 300, clean: bool = True) -> bool:
    if not pdf_path.exists():
        print(f"  ✗ PDF не найден: {pdf_path}")
        return False

    output_dir.mkdir(parents=True, exist_ok=True)

    if clean:
        for old in output_dir.glob("page_*.png"):
            old.unlink()

    print(f"  PDF: {pdf_path.name}")
    print(f"  → {output_dir}")

    try:
        doc = fitz.open(pdf_path)
        total = len(doc)
        if total == 0:
            print("  ⚠ PDF пустой")
            doc.close()
            return False

        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)

        for page_num in range(total):
            page = doc[page_num]
            pix = page.get_pixmap(matrix=mat)
            name = f"page_{page_num + 1:03d}.png"
            pix.save(str(output_dir / name))
            if (page_num + 1) % 10 == 0 or page_num + 1 == total:
                print(f"    {page_num + 1}/{total}")

        doc.close()
        print(f"  ✓ {total} страниц")
        return True
    except Exception as e:
        print(f"  ✗ {e}")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Конвертация PDF блоков дневников в PNG")
    parser.add_argument("--dpi", type=int, default=300, help="DPI (по умолчанию 300)")
    parser.add_argument(
        "--also-assets-pdfs",
        action="store_true",
        help="Дублировать PNG в assets/pdfs/<папка>/",
    )
    parser.add_argument(
        "--block",
        choices=["brown", "purple", "all"],
        default="all",
        help="Какой блок конвертировать",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    in_albums = root / "in albums"
    diary_cover = root / "albums" / "diary" / "cover" / "in album"
    assets_pdfs = root / "assets" / "pdfs"

    if not in_albums.exists():
        print(f"Ошибка: нет папки {in_albums}")
        sys.exit(1)

    blocks = DIARY_BLOCKS
    if args.block == "brown":
        blocks = [DIARY_BLOCKS[0]]
    elif args.block == "purple":
        blocks = [DIARY_BLOCKS[1]]

    print("=" * 60)
    print("Конвертация блоков дневников (06.26 → PNG)")
    print("=" * 60)

    ok = 0
    for spec in blocks:
        print("-" * 60)
        pdf_path = find_pdf_in_dir(in_albums, spec["pdf"])
        if not pdf_path:
            print(f"✗ Не найден PDF: {spec['pdf']} в {in_albums}")
            continue

        out_diary = diary_cover / spec["folder"]
        if extract_pdf_pages(pdf_path, out_diary, dpi=args.dpi):
            ok += 1

        if args.also_assets_pdfs:
            out_assets = assets_pdfs / spec["folder"]
            extract_pdf_pages(pdf_path, out_assets, dpi=args.dpi)

    print("=" * 60)
    print(f"Готово: {ok}/{len(blocks)} блоков")
    if ok:
        print("Далее: npm run generate:diary-interior-assets")
    print("=" * 60)
    sys.exit(0 if ok == len(blocks) else 1)


if __name__ == "__main__":
    main()
