import { colors, createShadow, radii, sansFont } from '@/constants/design-tokens';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { getAccountSyncId } from '@/utils/account-identity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

interface ExportRecord {
  id: string;
  projectId?: string | null;
  projectName: string;
  format: string;
  date: string;
  fileUri: string;
  fileName?: string;
  fileSize?: string;
}

export default function ExportHistoryScreen() {
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const opacity = useSharedValue(0);

  useEffect(() => {
    loadExportHistory();
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  // Обновляем список при возврате на экран
  useFocusEffect(
    React.useCallback(() => {
      loadExportHistory();
    }, [])
  );

  const loadExportHistory = async () => {
    try {
      const syncId = await getAccountSyncId();
      if (!syncId) {
        setExports([]);
        return;
      }

      const historyKey = `@export_history_${syncId}`;
      const saved = await AsyncStorage.getItem(historyKey);
      if (saved) {
        const allExports: ExportRecord[] = JSON.parse(saved);
        // Сортируем по дате (новые сверху)
        const sorted = allExports.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        });
        setExports(sorted);
      } else {
        setExports([]);
      }
    } catch (error) {
      console.error('Error loading export history:', error);
      setExports([]);
    }
  };

  const handleExportPress = (exportItem: ExportRecord) => {
    Alert.alert(
      exportItem.projectName,
      `Формат: ${exportItem.format}\nДата: ${new Date(exportItem.date).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Поделиться',
          onPress: () => handleShare(exportItem),
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => handleDelete(exportItem),
        },
      ]
    );
  };

  const handleShare = async (exportItem: ExportRecord) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(exportItem.fileUri);
      if (!fileInfo.exists) {
        Alert.alert('Ошибка', 'PDF файл не найден');
        return;
      }

      if (Platform.OS === 'web') {
        const base64 = await FileSystem.readAsStringAsync(exportItem.fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const blob = await fetch(`data:application/pdf;base64,${base64}`).then(r => r.blob());
        const file = new File([blob], exportItem.fileName || 'export.pdf', { type: 'application/pdf' });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'PDF файл',
          });
        } else {
          Alert.alert('Недоступно', 'Функция отправки недоступна в этом браузере');
        }
      } else {
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert('Недоступно', 'Функция отправки недоступна на этом устройстве');
          return;
        }

        let shareUri = exportItem.fileUri;
        if (!shareUri.startsWith('file://') && !shareUri.startsWith('http://') && !shareUri.startsWith('https://')) {
          shareUri = `file://${shareUri}`;
        }

        if (Platform.OS === 'android') {
          try {
            shareUri = await FileSystem.getContentUriAsync(shareUri);
          } catch (contentErr) {
            // Если не удалось, остаемся на file://
          }
        }

        await Sharing.shareAsync(shareUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Отправить PDF',
          ...(Platform.OS === 'ios' && { UTI: 'com.adobe.pdf' }),
        });
      }
    } catch (error) {
      console.error('Error sharing export:', error);
      const errorMessage = (error as Error).message || String(error);
      if (!errorMessage.includes('canceled') && !errorMessage.includes('Canceled')) {
        Alert.alert('Ошибка', 'Не удалось отправить файл');
      }
    }
  };

  const handleDelete = async (exportItem: ExportRecord) => {
    Alert.alert(
      'Удалить экспорт',
      `Вы уверены, что хотите удалить экспорт "${exportItem.projectName}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              // Удаляем файл
              try {
                const fileInfo = await FileSystem.getInfoAsync(exportItem.fileUri);
                if (fileInfo.exists) {
                  await FileSystem.deleteAsync(exportItem.fileUri, { idempotent: true });
                }
              } catch (fileError) {
                console.warn('Error deleting file:', fileError);
              }

              const syncId = await getAccountSyncId();
              if (syncId) {
                const historyKey = `@export_history_${syncId}`;
                const saved = await AsyncStorage.getItem(historyKey);
                if (saved) {
                  const allExports: ExportRecord[] = JSON.parse(saved);
                  const filtered = allExports.filter(item => item.id !== exportItem.id);
                  await AsyncStorage.setItem(historyKey, JSON.stringify(filtered));
                  setExports(filtered.sort((a, b) => {
                    const dateA = new Date(a.date).getTime();
                    const dateB = new Date(b.date).getTime();
                    return dateB - dateA;
                  }));
                }
              }
            } catch (error) {
              console.error('Error deleting export:', error);
              Alert.alert('Ошибка', 'Не удалось удалить экспорт');
            }
          },
        },
      ]
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={[styles.content, animatedStyle]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>История экспорта</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {exports.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={colors.tabInactive} />
              <Text style={styles.emptyStateText}>
                Здесь будут ваши экспортированные файлы
              </Text>
            </View>
          ) : (
            exports.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.exportCard}
                onPress={() => handleExportPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.exportIcon}>
                  <Ionicons name="document-text" size={32} color={colors.primary} />
                </View>
                <View style={styles.exportInfo}>
                  <Text style={styles.exportProject}>{item.projectName}</Text>
                  <Text style={styles.exportFormat}>{item.format}</Text>
                  <Text style={styles.exportDate}>
                    {new Date(item.date).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.tabInactive} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    fontSize: 28,
    color: colors.textPrimary,
    fontFamily: sansFont('bold'),
    fontWeight: '700',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  exportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  exportIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  exportInfo: {
    flex: 1,
  },
  exportProject: {
    fontSize: 18,
    color: colors.textPrimary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '500',
    marginBottom: 4,
  },
  exportFormat: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    marginBottom: 4,
  },
  exportDate: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '300',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    marginTop: 16,
    textAlign: 'center',
  },
});

