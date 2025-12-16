const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function createPreviewPDF(inputPath, outputPath) {
  try {
    console.log(`Creating preview for ${inputPath}...`);
    
    // Читаем исходный PDF
    const existingPdfBytes = fs.readFileSync(inputPath);
    
    // Загружаем PDF документ
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Создаем новый PDF с первыми 5 страницами для быстрого предпросмотра
    const previewPdf = await PDFDocument.create();
    
    const pages = pdfDoc.getPages();
    const previewPages = Math.min(5, pages.length);
    
    for (let i = 0; i < previewPages; i++) {
      const [copiedPage] = await previewPdf.copyPages(pdfDoc, [i]);
      previewPdf.addPage(copiedPage);
    }
    
    // Сохраняем предпросмотр PDF
    const pdfBytes = await previewPdf.save({
      useObjectStreams: false,
      addDefaultPage: false,
    });
    
    fs.writeFileSync(outputPath, pdfBytes);
    
    const originalSize = fs.statSync(inputPath).size;
    const previewSize = fs.statSync(outputPath).size;
    const sizeReduction = ((originalSize - previewSize) / originalSize * 100).toFixed(1);
    
    console.log(`✅ Preview created: ${path.basename(inputPath)}`);
    console.log(`   Original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Preview: ${(previewSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Size reduction: ${sizeReduction}%`);
    
  } catch (error) {
    console.error(`❌ Error creating preview for ${inputPath}:`, error.message);
  }
}

async function main() {
  const pdfsDir = path.join(__dirname, '..', 'assets', 'pdfs');
  const previewDir = path.join(__dirname, '..', 'assets', 'pdfs', 'preview');
  
  // Создаем папку для предпросмотров
  if (!fs.existsSync(previewDir)) {
    fs.mkdirSync(previewDir, { recursive: true });
  }
  
  // Находим все PDF файлы
  const pdfFiles = fs.readdirSync(pdfsDir).filter(file => file.endsWith('.pdf') && !file.includes('preview'));
  
  console.log(`Creating previews for ${pdfFiles.length} PDF files...`);
  
  for (const pdfFile of pdfFiles) {
    const inputPath = path.join(pdfsDir, pdfFile);
    const previewFile = pdfFile.replace('.pdf', '_preview.pdf');
    const outputPath = path.join(previewDir, previewFile);
    
    await createPreviewPDF(inputPath, outputPath);
  }
  
  console.log('\n🎉 PDF previews created!');
  console.log(`Preview files saved to: ${previewDir}`);
}

main().catch(console.error);
