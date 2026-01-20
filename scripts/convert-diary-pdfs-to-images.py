#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для конвертации PDF файлов в папке albums/diary в изображения
и организации структуры как в albums/kids.

Структура:
- albums/diary/DD1/first_page.png
- albums/diary/DD1/last_page.png
- albums/diary/DD2/first_page.png
- и т.д.
"""

import os
import sys
import re
import shutil
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Ошибка: PyMuPDF не установлен.")
    print("Установите его командой: pip install PyMuPDF")
    sys.exit(1)


def extract_dd_number(filename: str) -> str | None:
    """
    Извлекает номер DD из имени файла.
    Примеры:
    - '1 стр_DD1.pdf' -> 'DD1'
    - 'последняя стр_DD21.pdf' -> 'DD21'
    """
    match = re.search(r'DD(\d+)', filename, re.IGNORECASE)
    if match:
        return f"DD{match.group(1)}"
    return None


def convert_pdf_to_image(pdf_path: Path, output_path: Path, dpi: int = 300):
    """
    Конвертирует первую страницу PDF файла в изображение PNG.
    
    Args:
        pdf_path: Путь к PDF файлу
        output_path: Путь для сохранения изображения
        dpi: Разрешение изображений (по умолчанию 300)
    
    Returns:
        bool: True если успешно, False в случае ошибки
    """
    if not pdf_path.exists():
        print(f"  ⚠ Ошибка: Файл {pdf_path.name} не найден.")
        return False
    
    try:
        # Открываем PDF
        pdf_document = fitz.open(pdf_path)
        total_pages = len(pdf_document)
        
        if total_pages == 0:
            print(f"  ⚠ Пропущен: PDF файл пустой")
            pdf_document.close()
            return False
        
        # Извлекаем первую страницу
        page = pdf_document[0]
        
        # Конвертируем страницу в изображение
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)
        
        # Создаем директорию для выходного файла
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Сохраняем изображение
        pix.save(str(output_path))
        
        pdf_document.close()
        print(f"  ✓ Конвертировано: {pdf_path.name} -> {output_path.name}")
        return True
        
    except Exception as e:
        print(f"  ✗ Ошибка при обработке {pdf_path.name}: {e}")
        return False


def organize_diary_structure(diary_dir: Path):
    """
    Организует структуру папки diary как в kids.
    
    Обрабатывает PDF файлы из cover/in album/export/ и создает структуру:
    - albums/diary/DD1/first_page.png
    - albums/diary/DD1/last_page.png
    """
    export_dir = diary_dir / "cover" / "in album" / "export"
    
    if not export_dir.exists():
        print(f"Ошибка: Папка {export_dir} не найдена.")
        return False
    
    print("=" * 60)
    print("Организация структуры albums/diary")
    print("=" * 60)
    print(f"Исходная папка: {export_dir}")
    print()
    
    # Находим все PDF файлы
    pdf_files = sorted(export_dir.glob("*.pdf"))
    
    if not pdf_files:
        print("⚠ PDF файлы не найдены в папке cover/in album/export")
        return False
    
    print(f"Найдено PDF файлов: {len(pdf_files)}")
    print()
    
    # Группируем файлы по номеру DD
    dd_files: dict[str, dict[str, Path]] = {}
    
    for pdf_path in pdf_files:
        dd_number = extract_dd_number(pdf_path.name)
        if not dd_number:
            print(f"⚠ Не удалось извлечь номер DD из {pdf_path.name}")
            continue
        
        if dd_number not in dd_files:
            dd_files[dd_number] = {}
        
        if "1 стр" in pdf_path.name or "first" in pdf_path.name.lower():
            dd_files[dd_number]["first"] = pdf_path
        elif "последняя стр" in pdf_path.name or "last" in pdf_path.name.lower():
            dd_files[dd_number]["last"] = pdf_path
    
    print(f"Найдено альбомов DD: {len(dd_files)}")
    print()
    
    success_count = 0
    error_count = 0
    
    # Обрабатываем каждый альбом
    for dd_number, files in sorted(dd_files.items()):
        print("-" * 60)
        print(f"Обработка: {dd_number}")
        
        # Создаем папку для альбома
        album_dir = diary_dir / dd_number
        album_dir.mkdir(parents=True, exist_ok=True)
        
        # Конвертируем первую страницу
        if "first" in files:
            first_page_path = album_dir / "first_page.png"
            if convert_pdf_to_image(files["first"], first_page_path):
                success_count += 1
            else:
                error_count += 1
        else:
            print(f"  ⚠ Первая страница не найдена для {dd_number}")
        
        # Конвертируем последнюю страницу
        if "last" in files:
            last_page_path = album_dir / "last_page.png"
            if convert_pdf_to_image(files["last"], last_page_path):
                success_count += 1
            else:
                error_count += 1
        else:
            print(f"  ⚠ Последняя страница не найдена для {dd_number}")
        
        print()
    
    print("=" * 60)
    print(f"Обработка завершена!")
    print(f"Успешно конвертировано: {success_count} файлов")
    print(f"Ошибок: {error_count}")
    print("=" * 60)
    
    return True


def delete_pdf_files(diary_dir: Path):
    """
    Удаляет все PDF файлы из папки diary после конвертации.
    """
    print()
    print("=" * 60)
    print("Удаление PDF файлов")
    print("=" * 60)
    
    # Находим все PDF файлы в папке diary
    pdf_files = list(diary_dir.rglob("*.pdf"))
    
    if not pdf_files:
        print("⚠ PDF файлы не найдены")
        return
    
    print(f"Найдено PDF файлов для удаления: {len(pdf_files)}")
    print()
    
    deleted_count = 0
    error_count = 0
    
    for pdf_path in pdf_files:
        try:
            pdf_path.unlink()
            print(f"  ✓ Удален: {pdf_path.relative_to(diary_dir)}")
            deleted_count += 1
        except Exception as e:
            print(f"  ✗ Ошибка при удалении {pdf_path.name}: {e}")
            error_count += 1
    
    print()
    print("=" * 60)
    print(f"Удаление завершено!")
    print(f"Удалено: {deleted_count} файлов")
    print(f"Ошибок: {error_count}")
    print("=" * 60)


def main():
    # Определяем базовую директорию проекта
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    # Путь к папке diary
    diary_dir = project_root / "albums" / "diary"
    
    if not diary_dir.exists():
        print(f"Ошибка: Папка {diary_dir} не найдена.")
        sys.exit(1)
    
    # Шаг 1: Организуем структуру и конвертируем PDF
    if not organize_diary_structure(diary_dir):
        print("Ошибка при организации структуры.")
        sys.exit(1)
    
    # Шаг 2: Удаляем PDF файлы
    response = input("\nУдалить PDF файлы после конвертации? (y/n): ").strip().lower()
    if response == 'y' or response == 'yes' or response == 'да':
        delete_pdf_files(diary_dir)
    else:
        print("PDF файлы сохранены.")


if __name__ == "__main__":
    main()
