#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для организации папок DB1-DB6 в albums/ на основе изображений из albums/pregnant.
Создает папки DB1, DB2, DB3, DB4, DB5, DB6 в корне albums/ и копирует туда page_001.png
из соответствующих папок в pregnant/180х240/1 стр/
"""

import os
import sys
import shutil
from pathlib import Path


def organize_pregnancy_db_folders(albums_dir: Path):
    """
    Организует папки DB1-DB6 в albums/.
    """
    if not albums_dir.exists():
        print(f"Ошибка: Папка {albums_dir} не найдена.")
        return False
    
    pregnant_dir = albums_dir / "pregnant"
    if not pregnant_dir.exists():
        print(f"Ошибка: Папка {pregnant_dir} не найдена.")
        return False
    
    print("=" * 60)
    print("Организация папок DB1-DB6 в albums/")
    print("=" * 60)
    print(f"Исходная папка: {pregnant_dir}")
    print(f"Целевая папка: {albums_dir}")
    print()
    
    # Маппинг: DB номер -> путь к исходному изображению
    db_mapping = {
        'DB1': pregnant_dir / "180х240" / "1 стр" / "1 стр._DB1_60стр" / "page_001.png",
        'DB2': pregnant_dir / "180х240" / "1 стр" / "1 стр._DB2_60стр" / "page_001.png",
        'DB3': pregnant_dir / "180х240" / "1 стр" / "1 стр._DB3_60стр" / "page_001.png",
        'DB4': pregnant_dir / "180х240" / "1 стр" / "1 стр._DB4_60стр" / "page_001.png",
        'DB5': pregnant_dir / "180х240" / "1 стр" / "1 стр._DB5_60стр" / "page_001.png",
        'DB6': pregnant_dir / "180х240" / "1 стр" / "1 стр._DB6_60стр" / "page_001.png",
    }
    
    success_count = 0
    error_count = 0
    
    # Обрабатываем каждый DB
    for db_name, source_image in db_mapping.items():
        print("-" * 60)
        print(f"Обработка: {db_name}")
        
        if not source_image.exists():
            print(f"  ⚠ Исходное изображение не найдено: {source_image}")
            error_count += 1
            continue
        
        # Создаем папку для DB
        db_dir = albums_dir / db_name
        db_dir.mkdir(exist_ok=True)
        
        # Копируем изображение
        target_image = db_dir / "page_001.png"
        try:
            shutil.copy2(source_image, target_image)
            print(f"  ✓ Скопировано: {source_image.name} -> {db_name}/page_001.png")
            success_count += 1
        except Exception as e:
            print(f"  ✗ Ошибка при копировании: {e}")
            error_count += 1
        print()
    
    print("=" * 60)
    print(f"Организация завершена!")
    print(f"Успешно: {success_count}")
    print(f"Ошибок: {error_count}")
    print(f"Всего: {len(db_mapping)}")
    print("=" * 60)
    
    return True


def main():
    # Определяем базовую директорию проекта
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    # Путь к папке albums
    albums_dir = project_root / "albums"
    
    organize_pregnancy_db_folders(albums_dir)


if __name__ == "__main__":
    main()
