const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function compressPDF(inputPath, outputPath) {
  try {
    console.log(`Compressing ${inputPath}...`);
    
    // Читаем исходный PDF
    const existingPdfBytes = fs.readFileSync(inputPath);
    
    // Загружаем PDF документ
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Создаем новый PDF с оптимизациями
    const compressedPdf = await PDFDocument.create();
    
    // Копируем только первые 10 страниц для быстрой загрузки
    const pages = pdfDoc.getPages();
    const maxPages = Math.min(10, pages.length);
    
    for (let i = 0; i < maxPages; i++) {
      const [copiedPage] = await compressedPdf.copyPages(pdfDoc, [i]);
      compressedPdf.addPage(copiedPage);
    }
    
    // Сохраняем сжатый PDF
    const pdfBytes = await compressedPdf.save({
      useObjectStreams: false,
      addDefaultPage: false,
      objectsPerTick: 50,
    });
    
    fs.writeFileSync(outputPath, pdfBytes);
    
    const originalSize = fs.statSync(inputPath).size;
    const compressedSize = fs.statSync(outputPath).size;
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    console.log(`✅ Compressed: ${path.basename(inputPath)}`);
    console.log(`   Original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Compressed: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Saved: ${compressionRatio}%`);
    
  } catch (error) {
    console.error(`❌ Error compressing ${inputPath}:`, error.message);
  }
}

async function main() {
  const pdfsDir = path.join(__dirname, '..', 'assets', 'pdfs');
  const compressedDir = path.join(__dirname, '..', 'assets', 'pdfs', 'compressed');
  
  // Создаем папку для сжатых файлов
  if (!fs.existsSync(compressedDir)) {
    fs.mkdirSync(compressedDir, { recursive: true });
  }
  
  // Находим все PDF файлы
  const pdfFiles = fs.readdirSync(pdfsDir).filter(file => file.endsWith('.pdf'));
  
  console.log(`Found ${pdfFiles.length} PDF files to compress...`);
  
  for (const pdfFile of pdfFiles) {
    const inputPath = path.join(pdfsDir, pdfFile);
    const outputPath = path.join(compressedDir, pdfFile);
    
    await compressPDF(inputPath, outputPath);
  }
  
  console.log('\n🎉 PDF compression completed!');
  console.log(`Compressed files saved to: ${compressedDir}`);
}

main().catch(console.error);
