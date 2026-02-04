#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для удаления старых фото, оставляя только новые
"""

import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
GIFTS_FILE = PROJECT_ROOT / "app" / "(tabs)" / "gifts.tsx"
IMAGES_DIR = PROJECT_ROOT / "assets" / "images" / "albums"

def get_all_skus():
    """Получает все SKU из файла gifts.tsx"""
    with open(GIFTS_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Ищем все SKU
    pattern = r"sku:\s*['\"]([A-Z0-9]+)['\"]"
    skus = re.findall(pattern, content)
    return set(skus)

def cleanup_old_images():
    """Удаляет старые фото, оставляя только новые"""
    print("🧹 Очистка старых фото...\n")
    
    # Получаем все SKU
    skus = get_all_skus()
    print(f"✓ Найдено SKU: {len(skus)}")
    
    # Новые файлы - это {SKU}.png
    new_files = {f"{sku}.png" for sku in skus}
    
    # Также нужно сохранить специальные файлы
    special_files = {
        'DFA309 (2).png',  # Специальный файл для DFA309
    }
    
    # Все файлы, которые нужно сохранить
    files_to_keep = new_files | special_files
    
    print(f"✓ Файлов для сохранения: {len(files_to_keep)}\n")
    
    # Получаем все файлы в папке
    if not IMAGES_DIR.exists():
        print(f"❌ Папка не найдена: {IMAGES_DIR}")
        return
    
    all_files = list(IMAGES_DIR.glob("*.png"))
    print(f"📁 Всего файлов в папке: {len(all_files)}\n")
    
    # Удаляем старые файлы
    deleted_count = 0
    kept_count = 0
    
    for file_path in all_files:
        file_name = file_path.name
        
        if file_name in files_to_keep:
            kept_count += 1
            print(f"✓ Сохраняю: {file_name}")
        else:
            try:
                file_path.unlink()
                deleted_count += 1
                print(f"🗑️  Удалено: {file_name}")
            except Exception as e:
                print(f"❌ Ошибка при удалении {file_name}: {e}")
    
    print(f"\n{'='*50}")
    print(f"✅ Сохранено файлов: {kept_count}")
    print(f"🗑️  Удалено файлов: {deleted_count}")
    print(f"{'='*50}\n")
    print("🎉 Готово! Старые фото удалены, новые сохранены.")

if __name__ == "__main__":
    cleanup_old_images()





