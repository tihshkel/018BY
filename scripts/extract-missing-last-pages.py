#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Извлекает last_page.png или page_2.png для альбомов, где файла ещё нет.
Источник — PDF в той же папке или в albums/export / albums/family / albums/holiday.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Ошибка: PyMuPDF не установлен. Установите: pip install PyMuPDF")
    sys.exit(1)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ALBUMS_ROOT = PROJECT_ROOT / "albums"
EXPORT_ROOT = ALBUMS_ROOT / "export"
DEFAULT_DPI = 300

# A5 беременность: существующий last_str → pregnant/A5/DB*/last_page.png
PREGNANCY_A5_LAST_STR: dict[str, str] = {
    "DB1": "last_str_DB1_page_001.png",
    "DB2": "last_str_DB2_page_001.png",
    "DB3": "last_str_DB3_page_003.png",
    "DB4": "last_str_DB4_page_001.png",
    "DB5": "last_str_DB5_page_003.png",
}


def render_page(pdf_path: Path, page_index: int, output_path: Path, dpi: int = DEFAULT_DPI) -> bool:
    try:
        doc = fitz.open(pdf_path)
        if page_index < 0:
            page_index = len(doc) + page_index
        if page_index < 0 or page_index >= len(doc):
            print(f"  ✗ Неверный индекс страницы {page_index} в {pdf_path.name} ({len(doc)} стр.)")
            doc.close()
            return False
        page = doc[page_index]
        zoom = dpi / 72.0
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
        output_path.parent.mkdir(parents=True, exist_ok=True)
        pix.save(str(output_path))
        doc.close()
        print(f"  ✓ {output_path.relative_to(PROJECT_ROOT)} ← {pdf_path.name} [стр. {page_index + 1}]")
        return True
    except Exception as error:
        print(f"  ✗ Ошибка {pdf_path.name}: {error}")
        return False


def find_pdf(directory: Path, sku: str) -> Path | None:
    if not directory.exists():
        return None
    patterns = [
        f"{sku}_*.pdf",
        f"{sku.lower()}_*.pdf",
        f"{sku.upper()}_*.pdf",
    ]
    for pattern in patterns:
        matches = sorted(directory.glob(pattern))
        if matches:
            return matches[0]
    return None


def ensure_last_page(
    output_path: Path,
    pdf_path: Path | None,
    *,
    page_index: int = -1,
    copy_from: Path | None = None,
) -> bool:
    if output_path.exists():
        return False
    if copy_from and copy_from.exists():
        output_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(copy_from, output_path)
        print(f"  ✓ {output_path.relative_to(PROJECT_ROOT)} ← копия {copy_from.name}")
        return True
    if pdf_path and pdf_path.exists():
        return render_page(pdf_path, page_index, output_path)
    print(f"  ✗ Нет источника для {output_path.relative_to(PROJECT_ROOT)}")
    return False


def process_kids() -> int:
    created = 0
    kids_root = ALBUMS_ROOT / "kids"
    print("\n[kids] last_page.png")
    for kid_dir in sorted(kids_root.iterdir()):
        if not kid_dir.is_dir():
            continue
        sku = kid_dir.name
        output = kid_dir / "last_page.png"
        pdf = find_pdf(kid_dir, sku) or find_pdf(EXPORT_ROOT, sku)
        if ensure_last_page(output, pdf):
            created += 1
    return created


def process_diary() -> int:
    created = 0
    diary_root = ALBUMS_ROOT / "diary"
    print("\n[diary] last_page.png")
    for diary_dir in sorted(diary_root.iterdir()):
        if not diary_dir.is_dir() or not diary_dir.name.startswith("DD"):
            continue
        sku = diary_dir.name
        output = diary_dir / "last_page.png"
        pdf = find_pdf(diary_dir, sku) or find_pdf(EXPORT_ROOT, sku)
        if ensure_last_page(output, pdf):
            created += 1
    return created


def process_family() -> int:
    created = 0
    family_root = ALBUMS_ROOT / "family"
    print("\n[family] first_pages/*/page_2.png")
    for pdf_path in sorted(family_root.glob("SDFA*_*.pdf")):
        sku = pdf_path.name.split("_", 1)[0]
        output = family_root / "first_pages" / sku / "page_2.png"
        # В PDF обложки: page_2 = вторая страница (индекс 1), иначе последняя
        doc = fitz.open(pdf_path)
        page_index = 1 if len(doc) >= 2 else -1
        doc.close()
        if ensure_last_page(output, pdf_path, page_index=page_index):
            created += 1
    return created


def process_holiday() -> int:
    created = 0
    holiday_root = ALBUMS_ROOT / "holiday"
    print("\n[holiday] */last_page.png")
    for pdf_path in sorted(holiday_root.glob("*_пружина.pdf")):
        sku = pdf_path.name.replace("_пружина.pdf", "")
        output = holiday_root / sku / "last_page.png"
        if ensure_last_page(output, pdf_path, page_index=-1):
            created += 1
    return created


def process_pregnancy_a5() -> int:
    created = 0
    a5_root = ALBUMS_ROOT / "pregnant" / "A5"
    print("\n[pregnant/A5] DB*/last_page.png")
    for db_number, last_str_name in PREGNANCY_A5_LAST_STR.items():
        output = a5_root / db_number / "last_page.png"
        copy_from = a5_root / last_str_name
        pdf = find_pdf(EXPORT_ROOT, db_number)
        if ensure_last_page(output, pdf, page_index=-1, copy_from=copy_from):
            created += 1

    # DB6 — только из PDF
    db6_output = a5_root / "DB6" / "last_page.png"
    db6_pdf = find_pdf(EXPORT_ROOT, "DB6")
    if ensure_last_page(db6_output, db6_pdf, page_index=-1):
        created += 1

    return created


def main() -> None:
    print("=" * 60)
    print("Извлечение недостающих last_page.png / page_2.png")
    print("=" * 60)

    total = 0
    total += process_kids()
    total += process_diary()
    total += process_family()
    total += process_holiday()
    total += process_pregnancy_a5()

    print("\n" + "=" * 60)
    print(f"Готово. Создано файлов: {total}")
    print("=" * 60)


if __name__ == "__main__":
    main()
