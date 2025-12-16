#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для извлечения всех страниц из PDF файлов в изображения.
Каждый PDF сохраняется в отдельную папку.
"""

import os
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Ошибка: PyMuPDF не установлен.")
    print("Установите его командой: pip install PyMuPDF")
    sys.exit(1)


def extract_pdf_pages(pdf_path: Path, output_dir: Path, dpi: int = 300):
    """
    Извлекает все страницы из PDF в изображения PNG.
    
    Args:
        pdf_path: Путь к PDF файлу
        output_dir: Папка для сохранения изображений
        dpi: Разрешение изображений (по умолчанию 300)
    """
    if not pdf_path.exists():
        print(f"Ошибка: Файл {pdf_path} не найден.")
        return False
    
    # Создаем папку для выходных изображений
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Обработка: {pdf_path.name}")
    
    try:
        # Открываем PDF
        pdf_document = fitz.open(pdf_path)
        total_pages = len(pdf_document)
        
        print(f"  Найдено страниц: {total_pages}")
        
        # Извлекаем каждую страницу
        for page_num in range(total_pages):
            page = pdf_document[page_num]
            
            # Конвертируем страницу в изображение
            # zoom - коэффициент масштабирования (dpi/72)
            zoom = dpi / 72.0
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)
            
            # Сохраняем изображение
            # Нумерация страниц начинается с 1 для файлов
            image_filename = f"page_{page_num + 1:03d}.png"
            image_path = output_dir / image_filename
            
            pix.save(str(image_path))
            print(f"  Страница {page_num + 1}/{total_pages} -> {image_filename}")
        
        pdf_document.close()
        print(f"✓ Готово: {total_pages} страниц сохранено в {output_dir}")
        return True
        
    except Exception as e:
        print(f"Ошибка при обработке {pdf_path.name}: {e}")
        return False


def main():
    # Определяем базовую директорию проекта
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    pdfs_dir = project_root / "assets" / "pdfs"
    
    # Список PDF файлов для обработки
    pdf_files = [
        "Блок БЕРЕМЕННОСТЬ 60 стр.pdf",
        "Блок БЕРЕМЕННОСТЬ A5 другой блок.pdf"
    ]
    
    print("=" * 60)
    print("Извлечение страниц PDF в изображения")
    print("=" * 60)
    print()
    
    success_count = 0
    
    for pdf_filename in pdf_files:
        pdf_path = pdfs_dir / pdf_filename
        
        if not pdf_path.exists():
            print(f"⚠ Пропущен: {pdf_filename} (файл не найден)")
            continue
        
        # Создаем имя папки на основе имени PDF (без расширения)
        folder_name = pdf_path.stem
        output_dir = pdfs_dir / folder_name
        
        print()
        print(f"PDF: {pdf_filename}")
        print(f"Папка: {output_dir}")
        print("-" * 60)
        
        if extract_pdf_pages(pdf_path, output_dir):
            success_count += 1
    
    print()
    print("=" * 60)
    print(f"Обработано PDF файлов: {success_count}/{len(pdf_files)}")
    print("=" * 60)


if __name__ == "__main__":
    main()

