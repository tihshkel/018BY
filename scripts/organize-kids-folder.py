#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для организации папки albums/kids.
Создает папки с артикулами (DFA*) и копирует в них:
- Фото первой страницы из папки "1 стр_DFA*"
- Фото последней страницы из папки "последняя стр_DFA*"
"""

import os
import sys
import shutil
from pathlib import Path
import re


def extract_article_code(folder_name: str) -> str | None:
    """
    Извлекает артикул из названия папки.
    Примеры:
    - "1 стр_DFA9" -> "DFA9"
    - "последняя стр_DFA9" -> "DFA9"
    """
    # Ищем паттерн DFA + цифры
    match = re.search(r'DFA\d+', folder_name)
    if match:
        return match.group(0)
    return None


def organize_kids_folder(kids_dir: Path):
    """
    Организует папку kids: создает папки с артикулами и копирует изображения.
    """
    if not kids_dir.exists():
        print(f"Ошибка: Папка {kids_dir} не найдена.")
        return False
    
    print("=" * 60)
    print("Организация папки albums/kids")
    print("=" * 60)
    print(f"Исходная папка: {kids_dir}")
    print()
    
    # Находим все папки с изображениями
    first_page_folders = {}
    last_page_folders = {}
    
    for item in kids_dir.iterdir():
        if not item.is_dir():
            continue
        
        folder_name = item.name
        article_code = extract_article_code(folder_name)
        
        if not article_code:
            continue
        
        if folder_name.startswith("1 стр_"):
            first_page_folders[article_code] = item
        elif folder_name.startswith("последняя стр_"):
            last_page_folders[article_code] = item
    
    print(f"Найдено папок с первой страницей: {len(first_page_folders)}")
    print(f"Найдено папок с последней страницей: {len(last_page_folders)}")
    print()
    
    # Находим все уникальные артикулы
    all_articles = set(first_page_folders.keys()) | set(last_page_folders.keys())
    print(f"Найдено уникальных артикулов: {len(all_articles)}")
    print()
    
    success_count = 0
    error_count = 0
    skipped_count = 0
    
    # Обрабатываем каждый артикул
    for article_code in sorted(all_articles):
        print("-" * 60)
        print(f"Обработка артикула: {article_code}")
        
        # Создаем папку для артикула
        article_dir = kids_dir / article_code
        article_dir.mkdir(exist_ok=True)
        
        copied_first = False
        copied_last = False
        
        # Копируем первую страницу
        if article_code in first_page_folders:
            first_folder = first_page_folders[article_code]
            first_image = first_folder / "page_001.png"
            
            if first_image.exists():
                target_first = article_dir / "first_page.png"
                try:
                    shutil.copy2(first_image, target_first)
                    print(f"  ✓ Скопирована первая страница: {first_image.name} -> first_page.png")
                    copied_first = True
                except Exception as e:
                    print(f"  ✗ Ошибка при копировании первой страницы: {e}")
            else:
                print(f"  ⚠ Первая страница не найдена: {first_image}")
        else:
            print(f"  ⚠ Папка с первой страницей не найдена для {article_code}")
        
        # Копируем последнюю страницу
        if article_code in last_page_folders:
            last_folder = last_page_folders[article_code]
            last_image = last_folder / "page_001.png"
            
            if last_image.exists():
                target_last = article_dir / "last_page.png"
                try:
                    shutil.copy2(last_image, target_last)
                    print(f"  ✓ Скопирована последняя страница: {last_image.name} -> last_page.png")
                    copied_last = True
                except Exception as e:
                    print(f"  ✗ Ошибка при копировании последней страницы: {e}")
            else:
                print(f"  ⚠ Последняя страница не найдена: {last_image}")
        else:
            print(f"  ⚠ Папка с последней страницей не найдена для {article_code}")
        
        if copied_first and copied_last:
            success_count += 1
            print(f"  ✓ Готово: {article_code}/")
        elif copied_first or copied_last:
            skipped_count += 1
            print(f"  ⚠ Частично: {article_code}/ (не все изображения скопированы)")
        else:
            error_count += 1
            print(f"  ✗ Ошибка: {article_code}/ (ничего не скопировано)")
        print()
    
    print("=" * 60)
    print(f"Организация завершена!")
    print(f"Успешно: {success_count}")
    print(f"Частично: {skipped_count}")
    print(f"Ошибок: {error_count}")
    print(f"Всего артикулов: {len(all_articles)}")
    print("=" * 60)
    
    return True


def main():
    # Определяем базовую директорию проекта
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    # Путь к папке kids
    kids_dir = project_root / "albums" / "kids"
    
    organize_kids_folder(kids_dir)


if __name__ == "__main__":
    main()
