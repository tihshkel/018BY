const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');

async function createFastPDF(outputPath, title) {
  try {
    console.log(`Creating fast PDF: ${title}...`);
    
    // Создаем новый PDF документ
    const pdfDoc = await PDFDocument.create();
    
    // Добавляем одну страницу
    const page = pdfDoc.addPage([595, 842]); // A4 размер
    
    // Добавляем простой текст
    page.drawText(title, {
      x: 50,
      y: 750,
      size: 24,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    page.drawText('Быстрая загрузка PDF', {
      x: 50,
      y: 700,
      size: 16,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    page.drawText('Этот PDF оптимизирован для быстрого отображения', {
      x: 50,
      y: 650,
      size: 12,
      color: rgb(0.6, 0.6, 0.6),
    });
    
    // Добавляем простую рамку
    page.drawRectangle({
      x: 40,
      y: 600,
      width: 515,
      height: 200,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });
    
    // Сохраняем PDF с минимальными настройками
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: false,
      addDefaultPage: false,
    });
    
    fs.writeFileSync(outputPath, pdfBytes);
    
    const fileSize = fs.statSync(outputPath).size;
    console.log(`✅ Fast PDF created: ${path.basename(outputPath)}`);
    console.log(`   Size: ${(fileSize / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error(`❌ Error creating fast PDF:`, error.message);
  }
}

async function main() {
  const fastDir = path.join(__dirname, '..', 'assets', 'pdfs', 'fast');
  
  // Создаем папку для быстрых PDF
  if (!fs.existsSync(fastDir)) {
    fs.mkdirSync(fastDir, { recursive: true });
  }
  
  const pdfs = [
    { name: 'Блок БЕРЕМЕННОСТЬ 60 стр_fast.pdf', title: 'Блок БЕРЕМЕННОСТЬ 60 стр' },
    { name: 'Блок БЕРЕМЕННОСТЬ A5 другой блок_fast.pdf', title: 'Блок БЕРЕМЕННОСТЬ A5' },
  ];
  
  console.log(`Creating ${pdfs.length} fast PDF files...`);
  
  for (const pdf of pdfs) {
    const outputPath = path.join(fastDir, pdf.name);
    await createFastPDF(outputPath, pdf.title);
  }
  
  console.log('\n🎉 Fast PDFs created!');
  console.log(`Fast files saved to: ${fastDir}`);
}

main().catch(console.error);
