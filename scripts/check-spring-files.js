const fs = require("fs");
const path = require("path");

const exportDir = path.join(__dirname, "..", "albums", "export");
const files = fs.readdirSync(exportDir);
const springFiles = files.filter((file) => file.includes("пружина"));

console.log(`Всего файлов: ${files.length}`);
console.log(`Файлов с 'пружина': ${springFiles.length}`);
if (springFiles.length > 0) {
  console.log("\nПримеры файлов с 'пружина':");
  springFiles.slice(0, 10).forEach(f => console.log(`  - ${f}`));
}
