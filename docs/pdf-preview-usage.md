# Использование Preview PDF файлов

## Обзор

В приложении теперь поддерживается отображение preview версий PDF файлов из папки `assets/pdfs/preview/`. Preview версии обычно имеют меньший размер и загружаются быстрее, что улучшает производительность приложения.

## Структура файлов

```
assets/pdfs/
├── Блок БЕРЕМЕННОСТЬ 60 стр.pdf                    # Основной файл
├── Блок БЕРЕМЕННОСТЬ A5 другой блок.pdf           # Основной файл
└── preview/
    ├── Блок БЕРЕМЕННОСТЬ 60 стр_preview.pdf       # Preview версия
    └── Блок БЕРЕМЕННОСТЬ A5 другой блок_preview.pdf # Preview версия
```

## Автоматическое определение

Компонент `PdfViewer` автоматически определяет и загружает preview версии, если они доступны. Имя preview файла формируется по шаблону: `{имя_файла}_preview.pdf`

## Использование

### 1. Прямое использование preview файла

```typescript
import PdfViewer from '@/components/pdf-viewer';

// Использование preview версии напрямую
<PdfViewer
  pdfPath="Блок БЕРЕМЕННОСТЬ 60 стр_preview.pdf"
  albumName="Альбом беременности"
  onPageChange={(page, total) => console.log(`Страница ${page} из ${total}`)}
/>
```

### 2. Использование утилит для работы с preview

```typescript
import { getPdfPath, hasPreviewVersion } from '@/utils/pdfPreviewHelper';

// Проверка наличия preview версии
const fileName = 'Блок БЕРЕМЕННОСТЬ 60 стр.pdf';
if (hasPreviewVersion(fileName)) {
  console.log('Preview версия доступна');
}

// Получение пути к PDF (с автоматическим выбором preview, если доступен)
const pdfPath = getPdfPath(fileName, true); // true = предпочитать preview

<PdfViewer
  pdfPath={pdfPath}
  albumName="Альбом"
/>
```

### 3. Использование в edit-album.tsx

```typescript
// В функции loadPdfData можно использовать preview версии
const loadPdfData = async () => {
  // ...
  
  // Использовать preview версию для быстрой загрузки
  if (foundPdfPath && typeof foundPdfPath === 'string') {
    const previewPath = getPreviewFileName(foundPdfPath);
    if (PDF_ASSETS[previewPath as keyof typeof PDF_ASSETS]) {
      foundPdfPath = previewPath;
    }
  }
  
  setPdfPath(foundPdfPath);
  // ...
};
```

## API утилит

### `getPreviewFileName(fileName: string): string`
Возвращает имя preview файла, если он существует, иначе возвращает исходное имя.

### `getPdfAsset(fileName: string, usePreview: boolean): any`
Возвращает asset модуль для указанного PDF файла.

### `hasPreviewVersion(fileName: string): boolean`
Проверяет, доступна ли preview версия для указанного файла.

### `getPdfPath(baseFileName: string, preferPreview: boolean): string | number`
Возвращает путь к PDF файлу (основной или preview) для использования в компонентах.

## Примеры

### Пример 1: Загрузка preview версии для быстрого отображения

```typescript
import { getPreviewFileName } from '@/utils/pdfPreloader';
import PdfViewer from '@/components/pdf-viewer';

const QuickPreview = ({ baseFileName }: { baseFileName: string }) => {
  const previewFileName = getPreviewFileName(baseFileName);
  
  return (
    <PdfViewer
      pdfPath={previewFileName}
      albumName="Быстрый просмотр"
    />
  );
};
```

### Пример 2: Переключение между основной и preview версией

```typescript
import { useState } from 'react';
import { getPdfPath, hasPreviewVersion } from '@/utils/pdfPreviewHelper';
import PdfViewer from '@/components/pdf-viewer';

const TogglePreview = ({ baseFileName }: { baseFileName: string }) => {
  const [usePreview, setUsePreview] = useState(true);
  const hasPreview = hasPreviewVersion(baseFileName);
  
  return (
    <View>
      {hasPreview && (
        <TouchableOpacity onPress={() => setUsePreview(!usePreview)}>
          <Text>
            {usePreview ? 'Показать полную версию' : 'Показать preview'}
          </Text>
        </TouchableOpacity>
      )}
      <PdfViewer
        pdfPath={getPdfPath(baseFileName, usePreview)}
        albumName="Альбом"
      />
    </View>
  );
};
```

## Преимущества preview версий

1. **Быстрая загрузка** - меньший размер файла означает быстрее загрузку
2. **Экономия памяти** - preview версии занимают меньше места
3. **Улучшенный UX** - пользователь видит контент быстрее
4. **Автоматическое определение** - система сама находит preview версии

## Примечания

- Preview версии должны иметь суффикс `_preview.pdf`
- Если preview версия не найдена, используется основной файл
- Все preview файлы должны быть добавлены в маппинг `PDF_ASSETS` в `pdf-viewer.tsx`

