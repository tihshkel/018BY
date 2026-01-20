#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для замены всех массивов require() на IIFE формат с try-catch
"""

import re
from pathlib import Path

file_path = Path(__file__).parent.parent / "utils" / "coverImagesLoader.ts"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Паттерн для поиска массивов require
# Ищем: 'name': [ require(...), require(...), ... ],
pattern = r"'([^']+)':\s*\[\s*((?:require\([^)]+\)\s*,?\s*)+)\s*\]"

def convert_to_iife(match):
    folder_name = match.group(1)
    requires_text = match.group(2)
    
    # Извлекаем все require(...)
    require_pattern = r"require\('([^']+)'\)"
    requires = re.findall(require_pattern, requires_text)
    
    if not requires:
        return match.group(0)
    
    # Создаем IIFE
    result = f"  '{folder_name}': (() => {{\n    const images: any[] = [];\n"
    for req_path in requires:
        result += f"    try {{ images.push(require('{req_path}')); }} catch {{}}\n"
    result += "    return images;\n  })(),"
    
    return result

# Заменяем все вхождения
new_content = re.sub(pattern, convert_to_iife, content, flags=re.MULTILINE)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Замена завершена!")
