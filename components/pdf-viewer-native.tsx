import React from 'react';
import { Platform, View, Text, StyleSheet, TouchableOpacity, Alert, Linking, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import PdfSkeletonLoader from './pdf-skeleton-loader';

const { width, height } = Dimensions.get('window');

interface NativePdfViewerProps {
  source: any;
  style: any;
  onLoadComplete?: (numberOfPages: number, filePath: string) => void;
  onPageChanged?: (page: number, numberOfPages: number) => void;
  onError?: (error: any) => void;
  onPressBlank?: (event: any) => void;
  enablePaging?: boolean;
  enableRTL?: boolean;
  enableAntialiasing?: boolean;
  enableAnnotationRendering?: boolean;
  password?: string;
  spacing?: number;
  minScale?: number;
  maxScale?: number;
  scale?: number;
  horizontal?: boolean;
  page?: number;
  onLoadProgress?: (percent: number) => void;
  enableDoubleTapZoom?: boolean;
  enableSingleTapZoom?: boolean;
  enableSwipe?: boolean;
  swipeHorizontal?: boolean;
}

export default function NativePdfViewer(props: NativePdfViewerProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [pdfBase64, setPdfBase64] = React.useState<string | null>(null);
  const [pdfUri, setPdfUri] = React.useState<string | null>(null);
  const [error, setError] = React.useState<any>(null);
  const webViewRef = React.useRef<WebView>(null);
  
  console.log('NativePdfViewer render - Platform:', Platform.OS, 'source:', !!props.source);
  
  React.useEffect(() => {
    const loadPdf = async () => {
      if (!props.source) {
        console.log('NativePdfViewer: No source provided');
        setError(new Error('PDF source not provided'));
        return;
      }
      
      setIsLoading(true);
      setError(null);
      try {
        let fileUri: string | null = null;
        
        // Если это локальный ассет, конвертируем в URI
        if (typeof props.source === 'number') {
          console.log('NativePdfViewer: Loading asset ID:', props.source);
          // Для локальных ассетов используем expo-asset
          const { Asset } = await import('expo-asset');
          const asset = Asset.fromModule(props.source);
          console.log('NativePdfViewer: Asset module loaded:', asset);
          
          // Загружаем ассет
          await asset.downloadAsync();
          console.log('NativePdfViewer: Asset downloaded');
          
          // Получаем URI - предпочитаем localUri для мобильных устройств
          fileUri = asset.localUri || asset.uri;
          console.log('NativePdfViewer: PDF URI:', fileUri);
          console.log('NativePdfViewer: Local URI:', asset.localUri);
          console.log('NativePdfViewer: Remote URI:', asset.uri);
          
          if (!fileUri) {
            throw new Error('Failed to get PDF URI from asset');
          }
          
          // Убеждаемся, что URI правильно обработан
          // Для iOS localUri уже содержит file://, но проверим
          if (Platform.OS === 'ios') {
            // localUri уже должен содержать file://, но если нет - добавим
            if (fileUri && !fileUri.startsWith('file://') && !fileUri.startsWith('http')) {
              fileUri = `file://${fileUri}`;
            }
          }
          
          // Для Android также убеждаемся, что есть file://
          if (Platform.OS === 'android' && fileUri && !fileUri.startsWith('file://') && !fileUri.startsWith('http')) {
            fileUri = `file://${fileUri}`;
          }
          
          // Убеждаемся, что URI правильно экранирован для использования в HTML
          // Но не экранируем file:// протокол
          let encodedUri = fileUri;
          if (fileUri.startsWith('file://')) {
            const pathPart = fileUri.substring(7); // Убираем file://
            encodedUri = `file://${encodeURI(pathPart)}`;
          } else {
            encodedUri = encodeURI(fileUri);
          }
          
          console.log('NativePdfViewer: Final PDF URI:', encodedUri);
          
          setPdfUri(encodedUri);
        } else if (props.source && typeof props.source === 'object' && props.source.uri) {
          fileUri = props.source.uri;
          console.log('NativePdfViewer: Using provided URI:', fileUri);
          setPdfUri(fileUri);
        } else {
          console.error('NativePdfViewer: Unknown source type:', typeof props.source, props.source);
          throw new Error('Unknown PDF source type');
        }

        // Устанавливаем маркер загрузки
        if (fileUri) {
          console.log('NativePdfViewer: PDF URI ready:', fileUri);
          setPdfBase64('loaded'); // Устанавливаем маркер загрузки
          // Для react-native-pdf можно использовать URI напрямую
          // Компонент перерендерится с новым pdfUri
        } else {
          throw new Error('Failed to get PDF URI');
        }
      } catch (error: any) {
        console.error('NativePdfViewer: Error loading PDF:', error);
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();
  }, [props.source]);

  if (Platform.OS === 'web') {
    console.log('NativePdfViewer: Web platform detected, not rendering');
    return null;
  }

  if (isLoading) {
    return (
      <View style={[styles.container, props.style]}>
        <PdfSkeletonLoader />
      </View>
    );
  }

  if (error) {
    console.log('NativePdfViewer: Error state:', error);
    return (
      <View style={styles.fallbackContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
        <Text style={styles.fallbackTitle}>Ошибка загрузки PDF</Text>
        <Text style={styles.fallbackText}>
          {error.message || 'Не удалось загрузить PDF файл'}
        </Text>
        <Text style={styles.fallbackText}>
          URI: {pdfUri || 'не указан'}
        </Text>
      </View>
    );
  }

  if (!props.source || !pdfUri) {
    console.log('NativePdfViewer: No source or pdfUri provided');
    console.log('NativePdfViewer: source:', props.source);
    console.log('NativePdfViewer: pdfUri:', pdfUri);
    return (
      <View style={styles.fallbackContainer}>
        <Ionicons name="document-outline" size={64} color="#FF6B6B" />
        <Text style={styles.fallbackTitle}>PDF не найден</Text>
        <Text style={styles.fallbackText}>
          Источник PDF не указан
        </Text>
      </View>
    );
  }

  // HTML для встраивания PDF в WebView с прямым URI
  // Используем iframe для лучшей совместимости на мобильных устройствах
  const pdfHtml = pdfBase64 && pdfUri ? `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
        <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            margin: 0;
            padding: 0;
            background-color: #FAF8F5;
            overflow: hidden;
            height: 100vh;
            width: 100vw;
            -webkit-overflow-scrolling: touch;
          }
          .pdf-container {
            width: 100%;
            height: 100vh;
            position: relative;
            overflow: hidden;
          }
          iframe {
            width: 100%;
            height: 100%;
            border: none;
            position: absolute;
            top: 0;
            left: 0;
          }
          embed {
            width: 100%;
            height: 100%;
            border: none;
            position: absolute;
            top: 0;
            left: 0;
          }
          object {
            width: 100%;
            height: 100%;
            border: none;
            position: absolute;
            top: 0;
            left: 0;
          }
          .error-message {
            display: none;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: #D9776C;
            font-family: sans-serif;
          }
        </style>
        <script>
          // Отслеживание загрузки PDF
          window.addEventListener('load', function() {
            try {
              // Пробуем iframe
              const iframe = document.querySelector('iframe');
              if (iframe) {
                iframe.addEventListener('load', function() {
                  console.log('PDF iframe loaded successfully');
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'loaded',
                      success: true
                    }));
                  }
                });
                iframe.addEventListener('error', function() {
                  console.error('PDF iframe failed to load');
                  // Пробуем fallback с embed
                  tryFallback();
                });
              }
              
              function tryFallback() {
                const container = document.querySelector('.pdf-container');
                if (container) {
                  const embed = document.createElement('embed');
                  embed.src = '${pdfUri}#toolbar=1&navpanes=1&scrollbar=1&zoom=page-width';
                  embed.type = 'application/pdf';
                  embed.style.width = '100%';
                  embed.style.height = '100%';
                  embed.style.border = 'none';
                  container.appendChild(embed);
                  
                  embed.addEventListener('load', function() {
                    console.log('PDF embed loaded successfully');
                    if (window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'loaded',
                        success: true
                      }));
                    }
                  });
                }
              }
            } catch (e) {
              console.error('Error setting up PDF listeners:', e);
            }
          });
        </script>
      </head>
      <body>
        <div class="pdf-container">
          <iframe 
            src="${pdfUri}#toolbar=1&navpanes=1&scrollbar=1&zoom=page-width&page=1" 
            type="application/pdf"
            allow="fullscreen"
          ></iframe>
        </div>
      </body>
    </html>
  ` : '';

  const handleOpenExternal = async () => {
    try {
      if (pdfUri) {
        const supported = await Linking.canOpenURL(pdfUri);
        if (supported) {
          await Linking.openURL(pdfUri);
        } else {
          Alert.alert('Ошибка', 'Не удалось открыть PDF файл');
        }
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
      Alert.alert('Ошибка', 'Не удалось открыть PDF файл');
    }
  };

  const handlePrintPDF = async () => {
    try {
      if (pdfUri && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri);
      } else {
        Alert.alert('Ошибка', 'Печать недоступна на этом устройстве');
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
      Alert.alert('Ошибка', 'Не удалось поделиться PDF');
    }
  };

  if (!pdfBase64 || !pdfUri) {
    return (
      <View style={styles.fallbackContainer}>
        <Ionicons name="document-outline" size={64} color="#FF6B6B" />
        <Text style={styles.fallbackTitle}>Ошибка загрузки</Text>
        <Text style={styles.fallbackText}>
          Не удалось загрузить PDF файл
        </Text>
      </View>
    );
  }

  // Используем WebView для отображения PDF в Expo Go
  // react-native-pdf требует нативные модули и не работает в Expo Go
  // Используем WebView с прямым URI для отображения PDF

  // Используем WebView с HTML для отображения PDF
  // Это более надежный способ для Expo Go
  if (pdfUri && pdfBase64) {
    console.log('NativePdfViewer: Rendering PDF with HTML WebView, URI:', pdfUri);
    
    // Создаем HTML с правильным embed для PDF
    const pdfHtmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
          <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob: file:;">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
              background-color: #FAF8F5;
            }
            .pdf-wrapper {
              width: 100%;
              height: 100vh;
              position: relative;
            }
            embed {
              width: 100%;
              height: 100%;
              border: none;
              display: block;
            }
            iframe {
              width: 100%;
              height: 100%;
              border: none;
              display: block;
            }
            object {
              width: 100%;
              height: 100%;
              border: none;
              display: block;
            }
          </style>
        </head>
        <body>
          <div class="pdf-wrapper">
            <embed src="${pdfUri}" type="application/pdf" />
          </div>
          <script>
            // Fallback на iframe если embed не работает
            setTimeout(function() {
              const embed = document.querySelector('embed');
              if (embed && (!embed.offsetHeight || embed.offsetHeight === 0)) {
                console.log('Embed failed, trying iframe');
                const iframe = document.createElement('iframe');
                iframe.src = '${pdfUri}';
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.border = 'none';
                iframe.setAttribute('type', 'application/pdf');
                document.querySelector('.pdf-wrapper').innerHTML = '';
                document.querySelector('.pdf-wrapper').appendChild(iframe);
                
                iframe.onload = function() {
                  console.log('PDF iframe loaded successfully');
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'loaded',
                      success: true
                    }));
                  }
                };
                
                iframe.onerror = function() {
                  console.error('PDF iframe failed to load');
                  // Пробуем object как последний вариант
                  const object = document.createElement('object');
                  object.data = '${pdfUri}';
                  object.type = 'application/pdf';
                  object.style.width = '100%';
                  object.style.height = '100%';
                  object.style.border = 'none';
                  document.querySelector('.pdf-wrapper').innerHTML = '';
                  document.querySelector('.pdf-wrapper').appendChild(object);
                };
              } else {
                console.log('PDF embed loaded successfully');
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'loaded',
                    success: true
                  }));
                }
              }
            }, 500);
          </script>
        </body>
      </html>
    `;
    
    return (
      <View style={[styles.container, props.style]}>
        <WebView
          ref={webViewRef}
          source={{ html: pdfHtmlContent }}
          style={styles.webview}
          onLoadEnd={() => {
            console.log('NativePdfViewer: PDF HTML WebView loaded successfully');
            setIsLoading(false);
            if (props.onLoadComplete) {
              props.onLoadComplete(60, pdfUri);
            }
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('NativePdfViewer: WebView error:', nativeEvent);
            setIsLoading(false);
            setError(nativeEvent);
            if (props.onError) {
              props.onError(nativeEvent);
            }
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          originWhitelist={['*']}
          mixedContentMode="always"
          thirdPartyCookiesEnabled={true}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'pageChanged' && props.onPageChanged) {
                props.onPageChanged(data.page, data.totalPages);
              }
            } catch (e) {
              console.log('Error parsing WebView message:', e);
            }
          }}
        />
      </View>
    );
  }


  // Если ничего не готово, показываем загрузку
  return (
    <View style={[styles.container, props.style]}>
      <PdfSkeletonLoader />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#4A90E2',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5DADE2',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  toolbarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  webview: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  pdf: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FAF8F5',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FAF8F5',
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8B6F5F',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  fallbackText: {
    fontSize: 16,
    color: '#9B8E7F',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  fallbackHint: {
    fontSize: 14,
    color: '#B8A89A',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B6F5F',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 16,
    color: '#9B8E7F',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonGroup: {
    padding: 20,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#8B6F5F',
  },
  editButton: {
    backgroundColor: '#52C4A0',
  },
});