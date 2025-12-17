#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для извлечения первой страницы из PDF обложек в изображение.
Используется для конвертации PDF обложек в изображения для экспорта.
"""

import os
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Ошибка: PyMuPDF не установлен.")
    print("Установите: pip install PyMuPDF")
    sys.exit(1)


def extract_first_page(pdf_path: Path, output_path: Path, dpi: int = 300):
    """
    Извлекает первую страницу из PDF в изображение PNG.
    
    Args:
        pdf_path: Путь к PDF файлу
        output_path: Путь для сохранения изображения
        dpi: Разрешение изображения (по умолчанию 300)
    """
    if not pdf_path.exists():
        print(f"Ошибка: Файл {pdf_path} не найден.")
        return False
    
    print(f"Обработка: {pdf_path.name}")
    
    try:
        # Открываем PDF
        pdf_document = fitz.open(pdf_path)
        total_pages = len(pdf_document)
        
        if total_pages == 0:
            print(f"  Ошибка: PDF файл пустой")
            return False
        
        print(f"  Найдено страниц: {total_pages}")
        
        # Извлекаем первую страницу
        page = pdf_document[0]
        
        # Конвертируем страницу в изображение
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)
        
        # Сохраняем изображение
        pix.save(str(output_path))
        print(f"  ✓ Первая страница сохранена: {output_path.name}")
        
        pdf_document.close()
        return True
        
    except Exception as e:
        print(f"Ошибка при обработке {pdf_path.name}: {e}")
        return False


def main():
    # Определяем базовую директорию проекта
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    # Пути
    source_dir = Path("C:/Users/тихон/OneDrive/Рабочий стол/обложка")
    target_dir = project_root / "assets" / "pdfs" / "covers" / "pregnancy"
    target_images_dir = project_root / "assets" / "pdfs" / "covers" / "pregnancy" / "images"
    
    # Создаем целевую папку
    target_dir.mkdir(parents=True, exist_ok=True)
    target_images_dir.mkdir(parents=True, exist_ok=True)
    
    # Маппинг файлов
    file_mapping = {
        "DB1_твердый переплет.pdf": "DB1_твердый переплет",
        "DB1_пружина.pdf": "DB1_пружина",
        "DB2_твердый переплет.pdf": "DB2_твердый переплет",
        "DB2_пружина.pdf": "DB2_пружина",
        "DB3_твердый переплет.pdf": "DB3_твердый переплет",
        "DB3_пружина.pdf": "DB3_пружина",
        "DB4_твердый переплет.pdf": "DB4_твердый переплет",
        "DB4_пружина.pdf": "DB4_пружина",
        "DB5_твердый переплет.pdf": "DB5_твердый переплет",
        "DB5_пружина.pdf": "DB5_пружина",
    }
    
    print("=" * 60)
    print("Извлечение первой страницы из PDF обложек")
    print("=" * 60)
    print(f"Исходная папка: {source_dir}")
    print(f"Целевая папка: {target_dir}")
    print(f"Папка для изображений: {target_images_dir}")
    print("")
    
    copied_pdfs = 0
    extracted_images = 0
    
    # Копируем PDF файлы и извлекаем первую страницу
    for pdf_name, base_name in file_mapping.items():
        # Ищем PDF файл в исходной папке
        pdf_files = list(source_dir.glob(f"*{base_name}*.pdf"))
        
        if pdf_files:
            source_pdf = pdf_files[0]
            target_pdf = target_dir / pdf_name
            target_image = target_images_dir / f"{base_name}.png"
            
            # Копируем PDF
            if not target_pdf.exists():
                import shutil
                shutil.copy2(source_pdf, target_pdf)
                print(f"✓ Скопирован PDF: {pdf_name}")
                copied_pdfs += 1
            else:
                print(f"○ PDF уже существует: {pdf_name}")
            
            # Извлекаем первую страницу в изображение
            if extract_first_page(target_pdf, target_image):
                extracted_images += 1
        else:
            print(f"✗ Не найден PDF для: {pdf_name}")
    
    print("")
    print("=" * 60)
    print(f"Готово! Скопировано PDF: {copied_pdfs}, извлечено изображений: {extracted_images}")
    print("=" * 60)


if __name__ == "__main__":
    main()

