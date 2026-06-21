#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Конвертирует PDF дневников в PNG page_XXX.png.

Источники (поштучные макеты):
  in albums/ЛД А5/           → 40 стр. → Блок фиолетовый_180х240_print
  in albums/ЛД 180х240/      → 60 стр. → Блок коричневый _180х240_print

Legacy fallback (единый block PDF):
  in albums/09.06.26_*.pdf

После конвертации: npm run generate:diary-interior-assets
"""

from __future__ import annotations

import argparse
import re
import sys
import unicodedata
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Ошибка: PyMuPDF не установлен. Установите: pip install PyMuPDF")
    sys.exit(1)

PER_PAGE_BLOCKS = [
    {
        "key": "purple",
        "source_dir": "ЛД А5",
        "folder": "Блок фиолетовый_180х240_print",
        "expected_pages": 40,
    },
    {
        "key": "brown",
        "source_dir": "ЛД 180х240",
        "folder": "Блок коричневый _180х240_print",
        "expected_pages": 60,
    },
]

LEGACY_BLOCKS = [
    {
        "key": "brown",
        "pdf": "09.06.26_Блок коричневый _180х240_print.pdf",
        "folder": "Блок коричневый _180х240_print",
    },
    {
        "key": "purple",
        "pdf": "09.06.26_Блок фиолетовый_180х240_print.pdf",
        "folder": "Блок фиолетовый_180х240_print",
    },
]

PAGE_NUM_RE = re.compile(r"(\d+)\s*\.pdf$", re.IGNORECASE)


def normalize_name(name: str) -> str:
    return unicodedata.normalize("NFC", name)


def find_source_dir(in_albums: Path, dir_name: str) -> Path | None:
    target = normalize_name(dir_name).lower()
    for entry in in_albums.iterdir():
        if entry.is_dir() and normalize_name(entry.name).lower() == target:
            return entry
    return None


def list_per_page_pdfs(source_dir: Path) -> list[tuple[int, Path]]:
    files: list[tuple[int, Path]] = []
    for pdf_path in source_dir.glob("*.pdf"):
        match = PAGE_NUM_RE.search(normalize_name(pdf_path.name))
        if not match:
            continue
        files.append((int(match.group(1)), pdf_path))
    files.sort(key=lambda item: item[0])
    return files


def convert_single_pdf_page(pdf_path: Path, output_png: Path, dpi: int = 300) -> bool:
    try:
        doc = fitz.open(pdf_path)
        if len(doc) == 0:
            doc.close()
            return False
        page = doc[0]
        zoom = dpi / 72.0
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
        output_png.parent.mkdir(parents=True, exist_ok=True)
        pix.save(str(output_png))
        doc.close()
        return True
    except Exception as exc:
        print(f"  ✗ {pdf_path.name}: {exc}")
        return False


def convert_per_page_folder(
    source_dir: Path,
    output_dir: Path,
    expected_pages: int,
    dpi: int = 300,
    clean: bool = True,
) -> bool:
    pdfs = list_per_page_pdfs(source_dir)
    if len(pdfs) == 0:
        print(f"  ✗ Нет PDF в {source_dir}")
        return False

    output_dir.mkdir(parents=True, exist_ok=True)
    if clean:
        for old in output_dir.glob("page_*.png"):
            old.unlink()

    print(f"  Источник: {source_dir.name} ({len(pdfs)} PDF)")
    print(f"  → {output_dir}")

    ok = 0
    for page_num, pdf_path in pdfs:
        out_name = output_dir / f"page_{page_num:03d}.png"
        if convert_single_pdf_page(pdf_path, out_name, dpi=dpi):
            ok += 1

    print(f"  ✓ {ok}/{len(pdfs)} страниц")
    if expected_pages and ok != expected_pages:
        print(f"  ⚠ Ожидалось {expected_pages} страниц, получено {ok}")
    return ok > 0


def find_pdf_in_dir(directory: Path, basename: str) -> Path | None:
    exact = directory / basename
    if exact.exists():
        return exact
    key = basename.replace("09.06.26_", "").lower()
    for pdf_path in directory.glob("*.pdf"):
        if key in pdf_path.name.lower() or basename.lower() in pdf_path.name.lower():
            return pdf_path
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
    except Exception as exc:
        print(f"  ✗ {exc}")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Конвертация PDF дневников в PNG")
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
    parser.add_argument(
        "--legacy",
        action="store_true",
        help="Использовать legacy block PDF вместо поштучных папок",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    in_albums = root / "in albums"
    diary_cover = root / "albums" / "diary" / "cover" / "in album"
    assets_pdfs = root / "assets" / "pdfs"

    if not in_albums.exists():
        print(f"Ошибка: нет папки {in_albums}")
        sys.exit(1)

    blocks = PER_PAGE_BLOCKS if not args.legacy else LEGACY_BLOCKS
    if args.block == "brown":
        blocks = [b for b in blocks if b["key"] == "brown"]
    elif args.block == "purple":
        blocks = [b for b in blocks if b["key"] == "purple"]

    print("=" * 60)
    mode = "legacy block PDF" if args.legacy else "per-page PDF folders"
    print(f"Конвертация блоков дневников ({mode})")
    print("=" * 60)

    ok = 0
    for spec in blocks:
        print("-" * 60)
        out_diary = diary_cover / spec["folder"]

        if args.legacy:
            pdf_path = find_pdf_in_dir(in_albums, spec["pdf"])
            if not pdf_path:
                print(f"✗ Не найден PDF: {spec['pdf']}")
                continue
            success = extract_pdf_pages(pdf_path, out_diary, dpi=args.dpi)
        else:
            source_dir = find_source_dir(in_albums, spec["source_dir"])
            if not source_dir:
                print(f"✗ Не найдена папка: {spec['source_dir']}")
                continue
            success = convert_per_page_folder(
                source_dir,
                out_diary,
                spec.get("expected_pages", 0),
                dpi=args.dpi,
            )

        if success:
            ok += 1
            if args.also_assets_pdfs:
                out_assets = assets_pdfs / spec["folder"]
                if args.legacy:
                    extract_pdf_pages(pdf_path, out_assets, dpi=args.dpi)
                else:
                    convert_per_page_folder(
                        source_dir,
                        out_assets,
                        spec.get("expected_pages", 0),
                        dpi=args.dpi,
                    )

    print("=" * 60)
    print(f"Готово: {ok}/{len(blocks)} блоков")
    if ok:
        print("Далее: npm run generate:diary-interior-assets")
    print("=" * 60)
    sys.exit(0 if ok == len(blocks) else 1)


if __name__ == "__main__":
    main()
