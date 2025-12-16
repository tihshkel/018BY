const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function optimizePDF(inputPath, outputPath) {
  try {
    console.log(`Optimizing ${inputPath}...`);
    
    // Читаем исходный PDF
    const existingPdfBytes = fs.readFileSync(inputPath);
    
    // Загружаем PDF документ
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Создаем новый оптимизированный PDF
    const optimizedPdf = await PDFDocument.create();
    
    // Копируем только первые 3 страницы для быстрой загрузки
    const pages = pdfDoc.getPages();
    const maxPages = Math.min(3, pages.length);
    
    for (let i = 0; i < maxPages; i++) {
      const [copiedPage] = await optimizedPdf.copyPages(pdfDoc, [i]);
      optimizedPdf.addPage(copiedPage);
    }
    
    // Сохраняем оптимизированный PDF с минимальными настройками
    const pdfBytes = await optimizedPdf.save({
      useObjectStreams: false,
      addDefaultPage: false,
      objectsPerTick: 10, // Меньше объектов за раз для экономии памяти
    });
    
    fs.writeFileSync(outputPath, pdfBytes);
    
    const originalSize = fs.statSync(inputPath).size;
    const optimizedSize = fs.statSync(outputPath).size;
    const sizeReduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
    
    console.log(`✅ Optimized: ${path.basename(inputPath)}`);
    console.log(`   Original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Optimized: ${(optimizedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Size reduction: ${sizeReduction}%`);
    
  } catch (error) {
    console.error(`❌ Error optimizing ${inputPath}:`, error.message);
  }
}

async function main() {
  const pdfsDir = path.join(__dirname, '..', 'assets', 'pdfs');
  const optimizedDir = path.join(__dirname, '..', 'assets', 'pdfs', 'optimized');
  
  // Создаем папку для оптимизированных файлов
  if (!fs.existsSync(optimizedDir)) {
    fs.mkdirSync(optimizedDir, { recursive: true });
  }
  
  // Находим все PDF файлы
  const pdfFiles = fs.readdirSync(pdfsDir).filter(file => file.endsWith('.pdf') && !file.includes('preview') && !file.includes('optimized'));
  
  console.log(`Optimizing ${pdfFiles.length} PDF files...`);
  
  for (const pdfFile of pdfFiles) {
    const inputPath = path.join(pdfsDir, pdfFile);
    const optimizedFile = pdfFile.replace('.pdf', '_optimized.pdf');
    const outputPath = path.join(optimizedDir, optimizedFile);
    
    await optimizePDF(inputPath, outputPath);
  }
  
  console.log('\n🎉 PDF optimization completed!');
  console.log(`Optimized files saved to: ${optimizedDir}`);
}

main().catch(console.error);
