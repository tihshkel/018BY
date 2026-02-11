const fs = require("fs");
const path = require("path");

const exportDir = path.join(__dirname, "..", "albums", "export");
const files = fs.readdirSync(exportDir);

console.log(`Всего файлов в папке: ${files.length}\n`);

// Ищем файлы с разными вариантами "пружина"
const patterns = ["пружина", "пружина", "Пружина", "ПРУЖИНА"];
const springFiles = [];

files.forEach(file => {
  patterns.forEach(pattern => {
    if (file.includes(pattern) && !springFiles.includes(file)) {
      springFiles.push(file);
    }
  });
});

if (springFiles.length > 0) {
  console.log(`Найдено ${springFiles.length} файлов с 'пружина':\n`);
  springFiles.forEach(f => console.log(`  - ${f}`));
} else {
  console.log("Файлов с 'пружина' не найдено.");
  console.log("\nПервые 20 файлов в папке:");
  files.slice(0, 20).forEach(f => console.log(`  - ${f}`));
}
