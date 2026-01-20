#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для конвертации всех PDF файлов в папке albums/pregnant в изображения.
Рекурсивно обрабатывает все подпапки.
Для каждого PDF создается папка с изображениями в той же директории, где находится PDF.
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


def convert_pdf_to_images(pdf_path: Path, output_dir: Path, dpi: int = 300):
    """
    Конвертирует PDF файл в изображения.
    
    Создает папку с названием PDF (без расширения) в той же директории,
    где находится PDF, и сохраняет все страницы как изображения PNG.
    
    Args:
        pdf_path: Путь к PDF файлу
        output_dir: Директория для сохранения папки с изображениями
        dpi: Разрешение изображений (по умолчанию 300)
    
    Returns:
        bool: True если успешно, False в случае ошибки
    """
    if not pdf_path.exists():
        print(f"Ошибка: Файл {pdf_path} не найден.")
        return False
    
    print(f"Обработка: {pdf_path.relative_to(pdf_path.parents[3])}")
    
    try:
        # Открываем PDF
        pdf_document = fitz.open(pdf_path)
        total_pages = len(pdf_document)
        
        if total_pages == 0:
            print(f"  ⚠ Пропущен: PDF файл пустой")
            pdf_document.close()
            return False
        
        print(f"  Найдено страниц: {total_pages}")
        
        # Создаем имя папки на основе имени PDF (без расширения)
        folder_name = pdf_path.stem
        images_dir = output_dir / folder_name
        
        # Создаем папку для выходных изображений
        images_dir.mkdir(parents=True, exist_ok=True)
        
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
            image_path = images_dir / image_filename
            
            pix.save(str(image_path))
            print(f"  Страница {page_num + 1}/{total_pages} -> {image_filename}")
        
        pdf_document.close()
        print(f"✓ Готово: {total_pages} страниц сохранено в {images_dir.name}/")
        return True
        
    except Exception as e:
        print(f"✗ Ошибка при обработке {pdf_path.name}: {e}")
        return False


def main():
    # Определяем базовую директорию проекта
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    # Путь к папке с PDF файлами
    pregnant_dir = project_root / "albums" / "pregnant"
    
    if not pregnant_dir.exists():
        print(f"Ошибка: Папка {pregnant_dir} не найдена.")
        sys.exit(1)
    
    print("=" * 60)
    print("Конвертация PDF файлов в изображения")
    print("=" * 60)
    print(f"Исходная папка: {pregnant_dir}")
    print()
    
    # Рекурсивно находим все PDF файлы в папке pregnant
    pdf_files = sorted(pregnant_dir.rglob("*.pdf"))
    
    if not pdf_files:
        print("⚠ PDF файлы не найдены в папке albums/pregnant")
        sys.exit(0)
    
    print(f"Найдено PDF файлов: {len(pdf_files)}")
    print()
    
    success_count = 0
    error_count = 0
    
    # Обрабатываем каждый PDF файл
    for pdf_path in pdf_files:
        print("-" * 60)
        # Сохраняем изображения в той же папке, где находится PDF
        output_dir = pdf_path.parent
        if convert_pdf_to_images(pdf_path, output_dir):
            success_count += 1
        else:
            error_count += 1
        print()
    
    print("=" * 60)
    print(f"Обработка завершена!")
    print(f"Успешно: {success_count}")
    print(f"Ошибок: {error_count}")
    print(f"Всего: {len(pdf_files)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
