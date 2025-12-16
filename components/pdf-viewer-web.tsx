import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WebPdfViewerProps {
  pdfPath: string;
  albumName?: string;
  currentPage: number;
  totalPages: number;
  isEditing: boolean;
  currentTool: 'text' | 'image' | 'drawing' | null;
  annotations: any[];
  onAnnotationAdd: (annotation: any) => void;
  onAnnotationUpdate: (id: string, updates: any) => void;
  onAnnotationDelete: (id: string) => void;
}

export default function WebPdfViewer({
  pdfPath,
  albumName,
  currentPage,
  totalPages,
  isEditing,
  currentTool,
  annotations,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
}: WebPdfViewerProps) {
  if (Platform.OS !== 'web') {
    return null;
  }

  // Для веб-версии создаем iframe с PDF
  const getPdfUrl = () => {
    if (pdfPath.startsWith('./') || pdfPath.startsWith('/')) {
      const cleanPath = pdfPath.replace('./', '');
      return `/${cleanPath}`;
    }
    return pdfPath;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="document-text" size={32} color="#8B6F5F" />
        <Text style={styles.title}>PDF Просмотр</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.pageInfo}>
          <Text style={styles.pageTitle}>
            Страница {currentPage} из {totalPages}
          </Text>
        </View>
        
        <View style={styles.pdfContainer}>
          <iframe
            src={getPdfUrl()}
            style={styles.pdfFrame}
            title={albumName || 'PDF Document'}
            width="100%"
            height="100%"
            onError={() => {
              console.log('PDF iframe failed to load');
            }}
          />
        </View>
        
        <View style={styles.info}>
          <Text style={styles.infoText}>
            📱 Для редактирования PDF используйте мобильное приложение
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FAF8F5',
    borderBottomWidth: 2,
    borderBottomColor: '#F0E8E0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B6F5F',
    marginLeft: 12,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  pageInfo: {
    marginBottom: 16,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B6F5F',
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 400,
  },
  pdfFrame: {
    border: 'none',
    width: '100%',
    height: '100%',
  },
  info: {
    backgroundColor: '#E8F4FD',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C9A89A',
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#8B6F5F',
    textAlign: 'center',
    fontWeight: '500',
  },
});
