const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../utils/coverImagesLoader.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Функция для преобразования массива safeRequire в IIFE
function convertToIIFE(lines, folderName) {
  const images = [];
  const pagePattern = /safeRequire\('@\/albums\/([^']+)\/page_(\d+)\.png'\)/g;
  
  let match;
  const pages = new Set();
  while ((match = pagePattern.exec(lines)) !== null) {
    pages.add(parseInt(match[2]));
  }
  
  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  
  let result = `  '${folderName}': (() => {\n    const images: any[] = [];\n`;
  for (const pageNum of sortedPages) {
    const pageStr = pageNum.toString().padStart(3, '0');
    result += `    try { images.push(require('@/albums/${folderName}/page_${pageStr}.png')); } catch {}\n`;
  }
  result += `    return images;\n  })(),`;
  
  return result;
}

// Находим все блоки с safeRequire и заменяем их
const pattern = /'([^']+)':\s*\[[\s\S]*?safeRequire[^\]]+\][\s\S]*?\]\.filter\([^)]+\)/g;

let match;
const replacements = [];

while ((match = pattern.exec(content)) !== null) {
  const fullMatch = match[0];
  const folderName = match[1];
  
  // Извлекаем строки с safeRequire
  const lines = fullMatch;
  const replacement = convertToIIFE(lines, folderName);
  replacements.push({ old: fullMatch, new: replacement, folder: folderName });
}

// Применяем замены
for (const { old, new: replacement } of replacements) {
  content = content.replace(old, replacement);
}

// Удаляем функцию safeRequire, если она больше не используется
if (!content.includes('safeRequire(')) {
  content = content.replace(/function safeRequire\([^)]+\): any \| null \{[\s\S]*?\}\n\n/g, '');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`Обработано ${replacements.length} записей`);
