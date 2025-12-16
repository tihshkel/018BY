# План реализации нативного PDF Viewer (по аналогии с react-native-pdf-viewer)

## Анализ текущего состояния

**Текущая реализация:**
- Используется WebView для отображения PDF (не нативный рендеринг)
- Нет прямого доступа к нативным PDF рендер функциям
- Проект на Expo (managed workflow)

**Целевая реализация (как в react-native-pdf-viewer):**
- Нативный рендеринг через `android.graphics.pdf.PdfRenderer` (Android) и `CGPDFDocument` (iOS)
- Компонент для одной страницы (`PdfView`)
- Полный документ viewer на основе FlatList (`Pdf`)
- Поддержка зума через `react-native-gesture-handler`
- Поддержка аннотаций (PAS v1)

---

## Псевдокод реализации

### 1. Архитектура нативных модулей

```
// Структура проекта
native-modules/
  ├── pdf-renderer/
  │   ├── android/
  │   │   ├── PdfRendererModule.kt
  │   │   ├── PdfRendererPackage.kt
  │   │   └── PdfPageView.kt
  │   ├── ios/
  │   │   ├── PdfRendererModule.swift
  │   │   ├── PdfRendererPackage.swift
  │   │   └── PdfPageView.swift
  │   └── index.ts
```

### 2. Нативный модуль (Android - Kotlin)

```kotlin
// PdfRendererModule.kt
class PdfRendererModule(reactContext: ReactApplicationContext) 
  : ReactContextBaseJavaModule(reactContext) {
  
  // Получить количество страниц
  @ReactMethod
  fun getPageCount(source: String, promise: Promise) {
    try {
      val pdfRenderer = PdfRenderer(openPdfFile(source))
      val pageCount = pdfRenderer.pageCount
      pdfRenderer.close()
      promise.resolve(pageCount)
    } catch (e: Exception) {
      promise.reject("PDF_ERROR", e)
    }
  }
  
  // Получить размеры страниц
  @ReactMethod
  fun getPageSizes(source: String, promise: Promise) {
    try {
      val pdfRenderer = PdfRenderer(openPdfFile(source))
      val sizes = mutableListOf<WritableMap>()
      
      for (i in 0 until pdfRenderer.pageCount) {
        val page = pdfRenderer.openPage(i)
        val map = Arguments.createMap()
        map.putDouble("width", page.width.toDouble())
        map.putDouble("height", page.height.toDouble())
        sizes.add(map)
        page.close()
      }
      
      pdfRenderer.close()
      promise.resolve(Arguments.createArray().apply { 
        sizes.forEach { pushMap(it) }
      })
    } catch (e: Exception) {
      promise.reject("PDF_ERROR", e)
    }
  }
  
  private fun openPdfFile(source: String): ParcelFileDescriptor {
    // Обработка разных типов source (file://, asset, http)
    return when {
      source.startsWith("file://") -> 
        ParcelFileDescriptor.open(File(source.substring(7)), MODE_READ_ONLY)
      source.startsWith("asset://") -> 
        reactApplicationContext.assets.openFd(source.substring(8)).createInputStream()
      else -> throw IllegalArgumentException("Unsupported source")
    }
  }
}
```

```kotlin
// PdfPageView.kt - View для рендеринга одной страницы
class PdfPageView(context: Context) : View(context) {
  private var pdfRenderer: PdfRenderer? = null
  private var currentPage: PdfRenderer.Page? = null
  private var pageIndex: Int = 0
  private var source: String? = null
  
  fun setSource(source: String) {
    this.source = source
    loadPdf()
  }
  
  fun setPage(page: Int) {
    this.pageIndex = page
    renderPage()
  }
  
  private fun loadPdf() {
    // Загрузка PDF и инициализация рендерера
    pdfRenderer = PdfRenderer(openPdfFile(source))
    renderPage()
  }
  
  private fun renderPage() {
    currentPage?.close()
    currentPage = pdfRenderer?.openPage(pageIndex)
    invalidate() // Перерисовка
  }
  
  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    currentPage?.let { page ->
      // Масштабирование под размер view
      val scaleX = width / page.width.toFloat()
      val scaleY = height / page.height.toFloat()
      val scale = minOf(scaleX, scaleY)
      
      canvas.save()
      canvas.scale(scale, scale)
      page.render(canvas, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
      canvas.restore()
    }
  }
}
```

### 3. Нативный модуль (iOS - Swift)

```swift
// PdfRendererModule.swift
@objc(PdfRendererModule)
class PdfRendererModule: NSObject, RCTBridgeModule {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc
  func getPageCount(_ source: String, 
                    resolver: @escaping RCTPromiseResolveBlock,
                    rejecter: @escaping RCTPromiseRejectBlock) {
    guard let url = getPdfUrl(from: source),
          let document = CGPDFDocument(url as CFURL) else {
      rejecter("PDF_ERROR", "Failed to open PDF", nil)
      return
    }
    
    let pageCount = document.numberOfPages
    resolver(pageCount)
  }
  
  @objc
  func getPageSizes(_ source: String,
                    resolver: @escaping RCTPromiseResolveBlock,
                    rejecter: @escaping RCTPromiseRejectBlock) {
    guard let url = getPdfUrl(from: source),
          let document = CGPDFDocument(url as CFURL) else {
      rejecter("PDF_ERROR", "Failed to open PDF", nil)
      return
    }
    
    var sizes: [[String: CGFloat]] = []
    for i in 1...document.numberOfPages {
      guard let page = document.page(at: i) else { continue }
      let rect = page.getBoxRect(.mediaBox)
      sizes.append([
        "width": rect.width,
        "height": rect.height
      ])
    }
    
    resolver(sizes)
  }
  
  private func getPdfUrl(from source: String) -> URL? {
    if source.hasPrefix("file://") {
      return URL(string: source)
    } else if source.hasPrefix("asset://") {
      // Обработка asset
      return Bundle.main.url(forResource: source, withExtension: "pdf")
    }
    return URL(string: source)
  }
}
```

```swift
// PdfPageView.swift - UIView для рендеринга страницы
class PdfPageView: UIView {
  private var pdfDocument: CGPDFDocument?
  private var currentPage: CGPDFPage?
  private var pageIndex: Int = 0
  private var source: String?
  
  func setSource(_ source: String) {
    self.source = source
    loadPdf()
  }
  
  func setPage(_ page: Int) {
    self.pageIndex = page
    renderPage()
  }
  
  private func loadPdf() {
    guard let url = getPdfUrl(from: source),
          let document = CGPDFDocument(url as CFURL) else {
      return
    }
    pdfDocument = document
    renderPage()
  }
  
  private func renderPage() {
    guard let document = pdfDocument,
          let page = document.page(at: pageIndex + 1) else {
      return
    }
    currentPage = page
    setNeedsDisplay()
  }
  
  override func draw(_ rect: CGRect) {
    guard let page = currentPage,
          let context = UIGraphicsGetCurrentContext() else {
      return
    }
    
    context.saveGState()
    
    // Масштабирование
    let pageRect = page.getBoxRect(.mediaBox)
    let scaleX = rect.width / pageRect.width
    let scaleY = rect.height / pageRect.height
    let scale = min(scaleX, scaleY)
    
    context.scaleBy(x: scale, y: scale)
    context.translateBy(x: -pageRect.origin.x, y: -pageRect.origin.y)
    
    context.drawPDFPage(page)
    context.restoreGState()
  }
}
```

### 4. TypeScript интерфейсы и утилиты

```typescript
// native-modules/pdf-renderer/index.ts

import { NativeModules, NativeEventEmitter } from 'react-native';

interface PdfRendererModule {
  getPageCount(source: string): Promise<number>;
  getPageSizes(source: string): Promise<Array<{ width: number; height: number }>>;
}

const { PdfRendererModule } = NativeModules;

export const PdfUtil = {
  getPageCount: (source: string): Promise<number> => {
    return PdfRendererModule.getPageCount(source);
  },
  
  getPageSizes: (source: string): Promise<Array<{ width: number; height: number }>> => {
    return PdfRendererModule.getPageSizes(source);
  }
};
```

### 5. React Native компонент для одной страницы

```typescript
// components/PdfView.tsx

interface PdfViewProps {
  source: string;
  page: number; // 0-indexed
  resizeMode?: 'contain' | 'fitWidth';
  style?: ViewStyle;
  onError?: (error: Error) => void;
}

const PdfView: React.FC<PdfViewProps> = ({
  source,
  page,
  resizeMode = 'contain',
  style,
  onError
}) => {
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  
  useEffect(() => {
    PdfUtil.getPageSizes(source)
      .then(sizes => {
        if (sizes[page]) {
          setPageSize(sizes[page]);
        }
      })
      .catch(onError);
  }, [source, page]);
  
  const aspectRatio = pageSize 
    ? pageSize.width / pageSize.height 
    : undefined;
  
  return (
    <NativePdfPageView
      source={source}
      page={page}
      resizeMode={resizeMode}
      style={[
        style,
        aspectRatio && { aspectRatio }
      ]}
      onError={onError}
    />
  );
};
```

### 6. React Native компонент для полного документа (FlatList)

```typescript
// components/Pdf.tsx

interface PdfProps {
  source: string;
  onLoadComplete?: (numberOfPages: number) => void;
  onError?: (error: Error) => void;
  shrinkToFit?: 'never' | 'portrait' | 'landscape' | 'always';
  initialScrollIndex?: number;
  // ... другие FlatList props
}

const Pdf: React.FC<PdfProps> = ({
  source,
  onLoadComplete,
  onError,
  shrinkToFit = 'never',
  initialScrollIndex,
  ...flatListProps
}) => {
  const [pageCount, setPageCount] = useState(0);
  const [pageSizes, setPageSizes] = useState<Array<{ width: number; height: number }>>([]);
  const [deviceOrientation, setDeviceOrientation] = useState<'portrait' | 'landscape'>('portrait');
  
  useEffect(() => {
    // Загрузка информации о PDF
    Promise.all([
      PdfUtil.getPageCount(source),
      PdfUtil.getPageSizes(source)
    ])
      .then(([count, sizes]) => {
        setPageCount(count);
        setPageSizes(sizes);
        onLoadComplete?.(count);
      })
      .catch(onError);
  }, [source]);
  
  // Определение ориентации устройства
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDeviceOrientation(
        window.width > window.height ? 'landscape' : 'portrait'
      );
    });
    return () => subscription?.remove();
  }, []);
  
  // Вычисление размеров страниц с учетом shrinkToFit
  const getItemLayout = (data: any, index: number) => {
    const size = pageSizes[index];
    if (!size) return { length: 0, offset: 0, index };
    
    let itemHeight = size.height;
    const screenWidth = Dimensions.get('window').width;
    
    // Применение shrinkToFit
    if (shrinkToFit === 'always' || 
        (shrinkToFit === 'portrait' && deviceOrientation === 'portrait') ||
        (shrinkToFit === 'landscape' && deviceOrientation === 'landscape')) {
      const scale = screenWidth / size.width;
      itemHeight = size.height * scale;
    }
    
    // Вычисление offset (сумма высот предыдущих страниц)
    let offset = 0;
    for (let i = 0; i < index; i++) {
      const prevSize = pageSizes[i];
      if (prevSize) {
        const scale = shrinkToFit !== 'never' 
          ? screenWidth / prevSize.width 
          : 1;
        offset += prevSize.height * scale;
      }
    }
    
    return {
      length: itemHeight,
      offset,
      index
    };
  };
  
  const renderItem = ({ item, index }: { item: number; index: number }) => {
    return (
      <PdfView
        source={source}
        page={index}
        resizeMode={shrinkToFit !== 'never' ? 'fitWidth' : 'contain'}
        style={{ width: '100%' }}
        onError={onError}
      />
    );
  };
  
  return (
    <FlatList
      data={Array.from({ length: pageCount }, (_, i) => i)}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      keyExtractor={(item) => item.toString()}
      initialScrollIndex={initialScrollIndex}
      {...flatListProps}
    />
  );
};
```

### 7. Компонент с поддержкой зума

```typescript
// components/ZoomPdfView.tsx

import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  withTiming 
} from 'react-native-reanimated';

interface ZoomPdfViewProps extends PdfViewProps {
  maximumZoom?: number;
  onZoomIn?: () => void;
  onZoomReset?: () => void;
}

const ZoomPdfView: React.FC<ZoomPdfViewProps> = ({
  maximumZoom = 2,
  onZoomIn,
  onZoomReset,
  ...pdfViewProps
}) => {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  
  // Жест pinch-to-zoom
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const newScale = savedScale.value * e.scale;
      scale.value = Math.min(Math.max(newScale, 1), maximumZoom);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value === 1) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        onZoomReset?.();
      } else {
        onZoomIn?.();
      }
    });
  
  // Жест pan (перемещение при зуме)
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });
  
  // Композитный жест
  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value }
    ]
  }));
  
  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <PdfView {...pdfViewProps} />
      </Animated.View>
    </GestureDetector>
  );
};
```

### 8. Поддержка аннотаций (PAS v1)

```typescript
// types/annotation.ts

interface Annotation {
  type: 'text' | 'highlight' | 'note' | 'drawing';
  page: number;
  rect: { x: number; y: number; width: number; height: number };
  content?: string;
  color?: string;
  // ... другие поля PAS v1
}

// components/PdfWithAnnotations.tsx

const PdfWithAnnotations: React.FC<PdfProps & {
  annotation?: string; // путь к файлу аннотаций
  annotationStr?: string; // JSON строка аннотаций
}> = ({ annotation, annotationStr, ...pdfProps }) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  
  useEffect(() => {
    if (annotationStr) {
      try {
        const parsed = JSON.parse(annotationStr);
        setAnnotations(parsed);
      } catch (e) {
        console.error('Failed to parse annotations', e);
      }
    } else if (annotation) {
      // Загрузка из файла
      // ...
    }
  }, [annotation, annotationStr]);
  
  const renderItem = ({ item, index }: { item: number; index: number }) => {
    const pageAnnotations = annotations.filter(a => a.page === index);
    
    return (
      <View style={{ position: 'relative' }}>
        <PdfView source={pdfProps.source} page={index} />
        {pageAnnotations.map((ann, i) => (
          <AnnotationOverlay key={i} annotation={ann} />
        ))}
      </View>
    );
  };
  
  // Использование в FlatList
  // ...
};
```

---

## План миграции

### Этап 1: Подготовка
1. Создать структуру нативных модулей
2. Настроить Expo config plugin для нативных модулей
3. Установить зависимости (`react-native-gesture-handler` уже есть)

### Этап 2: Нативные модули
1. Реализовать Android модуль (Kotlin)
2. Реализовать iOS модуль (Swift)
3. Создать TypeScript интерфейсы

### Этап 3: React компоненты
1. Создать `PdfView` (одна страница)
2. Создать `Pdf` (полный документ)
3. Создать `ZoomPdfView` (с зумом)

### Этап 4: Интеграция
1. Заменить текущий `NativePdfViewer` на новый компонент
2. Обновить `pdf-viewer.tsx` для использования новых компонентов
3. Тестирование на Android и iOS

### Этап 5: Оптимизация
1. Кэширование рендеринга страниц
2. Ленивая загрузка страниц
3. Оптимизация памяти

---

## Важные замечания

1. **Expo Managed Workflow**: Для нативных модулей потребуется либо:
   - Переход на Expo Development Build
   - Использование Expo Config Plugin
   - Или переход на bare workflow

2. **Размер приложения**: Нативный рендеринг уменьшит размер по сравнению с WebView

3. **Производительность**: Нативный рендеринг будет быстрее и плавнее

4. **Совместимость**: Убедиться в поддержке Android API 21+ и iOS 11+

---

## Альтернативный подход (без нативных модулей)

Если создание нативных модулей невозможно, можно использовать существующую библиотеку:
- `react-native-pdf` (уже в зависимостях, но не используется)
- Обернуть её в компоненты с нужным API

