#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для восстановления отсутствующих изображений из git
"""

import re
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
ALBUMS_FILE = PROJECT_ROOT / "albums" / "index.ts"
GIFTS_FILE = PROJECT_ROOT / "app" / "(tabs)" / "gifts.tsx"
CONSTANTS_FILE = PROJECT_ROOT / "constants" / "images.ts"
IMAGES_DIR = PROJECT_ROOT / "assets" / "images" / "albums"

def extract_image_files_from_file(file_path: Path) -> set:
    """Извлекает все пути к изображениям из файла"""
    if not file_path.exists():
        return set()
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Ищем все require('.../albums/...png')
    pattern = r"require\(['\"]([^'\"]*albums/[^'\"]+\.png)['\"]\)"
    matches = re.findall(pattern, content)
    
    # Извлекаем только имена файлов
    files = set()
    for match in matches:
        # Убираем ../ или @/assets/images/albums/
        filename = match.split('/')[-1]
        files.add(filename)
    
    return files

def main():
    print("🔍 Ищу все используемые изображения...")
    
    # Собираем все используемые файлы
    all_files = set()
    all_files.update(extract_image_files_from_file(ALBUMS_FILE))
    all_files.update(extract_image_files_from_file(GIFTS_FILE))
    all_files.update(extract_image_files_from_file(CONSTANTS_FILE))
    
    print(f"✓ Найдено {len(all_files)} уникальных файлов")
    
    # Проверяем, какие файлы отсутствуют
    missing_files = []
    for filename in all_files:
        file_path = IMAGES_DIR / filename
        if not file_path.exists():
            missing_files.append(filename)
            print(f"  ⚠️ Отсутствует: {filename}")
    
    if not missing_files:
        print("\n✅ Все файлы на месте!")
        return
    
    print(f"\n📥 Восстанавливаю {len(missing_files)} файлов из git...")
    
    # Восстанавливаем файлы из git
    for filename in missing_files:
        file_path = IMAGES_DIR / filename
        try:
            result = subprocess.run(
                ['git', 'restore', str(file_path)],
                cwd=PROJECT_ROOT,
                capture_output=True,
                text=True,
                timeout=5
            )
            if file_path.exists():
                print(f"  ✅ Восстановлен: {filename}")
            else:
                print(f"  ⚠️ Не удалось восстановить: {filename}")
        except Exception as e:
            print(f"  ❌ Ошибка при восстановлении {filename}: {e}")
    
    print("\n✅ Готово!")

if __name__ == "__main__":
    main()

