import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function QrScanScreen() {
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={[styles.content, animatedStyle]}>
        {/* Заголовок */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#8B6F5F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Отсканировать QR-код</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Информационный блок */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="qr-code" size={48} color="#C9A89A" />
            </View>
            <Text style={styles.infoTitle}>
              Вход через QR-код
            </Text>
            <Text style={styles.infoText}>
              Отсканируйте QR-код на новом устройстве, чтобы войти в свой аккаунт без ввода кода доступа.
            </Text>
          </View>

          {/* Инструкции */}
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>Как это работает:</Text>
            
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>1</Text>
              </View>
              <View style={styles.instructionContent}>
                <Text style={styles.instructionText}>
                  Откройте приложение на новом устройстве
                </Text>
              </View>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>2</Text>
              </View>
              <View style={styles.instructionContent}>
                <Text style={styles.instructionText}>
                  Выберите опцию входа через QR-код
                </Text>
              </View>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>3</Text>
              </View>
              <View style={styles.instructionContent}>
                <Text style={styles.instructionText}>
                  Отсканируйте QR-код, который появится на экране нового устройства, используя камеру этого устройства
                </Text>
              </View>
            </View>
          </View>

          {/* Область для сканера (заглушка) */}
          <View style={styles.scannerPlaceholder}>
            <Ionicons name="camera-outline" size={64} color="#D4C4B5" />
            <Text style={styles.scannerPlaceholderText}>
              Сканер QR-кода
            </Text>
            <Text style={styles.scannerPlaceholderSubtext}>
              Функционал сканирования будет добавлен в следующей версии
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 22,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0E8E0',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  infoTitle: {
    fontSize: 20,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    marginBottom: 12,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    lineHeight: 20,
    textAlign: 'center',
  },
  instructionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0E8E0',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  instructionsTitle: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    marginBottom: 20,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  instructionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#C9A89A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  instructionNumberText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
  instructionContent: {
    flex: 1,
    paddingTop: 4,
  },
  instructionText: {
    fontSize: 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    lineHeight: 20,
  },
  scannerPlaceholder: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F0E8E0',
    borderStyle: 'dashed',
    minHeight: 300,
  },
  scannerPlaceholderText: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  scannerPlaceholderSubtext: {
    fontSize: 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 20,
  },
});

