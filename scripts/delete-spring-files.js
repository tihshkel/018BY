#!/usr/bin/env node

/**
 * Скрипт для удаления всех файлов с "пружина" в названии из папки albums/export
 */

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const exportDir = path.join(root, "albums", "export");

async function deleteSpringFiles() {
  try {
    // Проверяем существование папки
    if (!fs.existsSync(exportDir)) {
      console.error(`❌ Папка ${exportDir} не существует`);
      process.exit(1);
    }

    // Читаем все файлы в папке
    const files = fs.readdirSync(exportDir);
    
    // Фильтруем файлы с "пружина" в названии (проверяем в разных регистрах и кодировках)
    const springFiles = files.filter((file) => {
      const lowerFile = file.toLowerCase();
      return lowerFile.includes("пружина") || 
             lowerFile.includes("пружина") ||
             file.includes("пружина") ||
             file.includes("пружина");
    });

    if (springFiles.length === 0) {
      console.log("✅ Файлов с 'пружина' в названии не найдено");
      return;
    }

    console.log(`📋 Найдено ${springFiles.length} файлов с 'пружина' в названии:\n`);
    
    // Удаляем каждый файл
    let deletedCount = 0;
    let errorCount = 0;

    for (const file of springFiles) {
      const filePath = path.join(exportDir, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`✅ Удален: ${file}`);
        deletedCount++;
      } catch (error) {
        console.error(`❌ Ошибка при удалении ${file}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Результат:`);
    console.log(`   Успешно удалено: ${deletedCount}`);
    if (errorCount > 0) {
      console.log(`   Ошибок: ${errorCount}`);
    }
    console.log(`\n✅ Готово!`);

  } catch (error) {
    console.error(`❌ Ошибка при выполнении скрипта: ${error.message}`);
    process.exit(1);
  }
}

// Запускаем скрипт
deleteSpringFiles();
