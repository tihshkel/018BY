import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Clipboard,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface AccessCodeModalManagerProps {
  isEligibleToShow: boolean;
}

export function AccessCodeModalManager({ isEligibleToShow }: AccessCodeModalManagerProps) {
  const [showAccessCodeModal, setShowAccessCodeModal] = useState(false);
  const [showAccessCodeInfoModal, setShowAccessCodeInfoModal] = useState(false);
  const [accessCode, setAccessCode] = useState('');

  const hasScheduledRef = useRef(false);
  const hasShownRef = useRef(false);

  const accessCodeOverlayOpacity = useSharedValue(0);
  const accessCodeModalOpacity = useSharedValue(0);
  const accessCodeModalScale = useSharedValue(0.92);
  const accessCodeModalTranslateY = useSharedValue(12);

  const infoModalOverlayOpacity = useSharedValue(0);
  const infoModalOpacity = useSharedValue(0);
  const infoModalScale = useSharedValue(0.9);

  const runAccessCodeEnterAnimation = useCallback(() => {
    accessCodeOverlayOpacity.value = 0;
    accessCodeModalOpacity.value = 0;
    accessCodeModalScale.value = 0.92;
    accessCodeModalTranslateY.value = 12;

    accessCodeOverlayOpacity.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });

    const contentDelayMs = 70;
    accessCodeModalOpacity.value = withDelay(
      contentDelayMs,
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) })
    );
    accessCodeModalScale.value = withDelay(
      contentDelayMs,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
    accessCodeModalTranslateY.value = withDelay(
      contentDelayMs,
      withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
  }, [
    accessCodeOverlayOpacity,
    accessCodeModalOpacity,
    accessCodeModalScale,
    accessCodeModalTranslateY,
  ]);

  const runInfoEnterAnimation = useCallback(() => {
    infoModalOverlayOpacity.value = 0;
    infoModalOpacity.value = 0;
    infoModalScale.value = 0.9;

    infoModalOverlayOpacity.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });

    infoModalOpacity.value = withDelay(
      70,
      withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) })
    );
    infoModalScale.value = withDelay(
      70,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) })
    );
  }, [infoModalOverlayOpacity, infoModalOpacity, infoModalScale]);

  const scheduleShowIfNeeded = useCallback(async () => {
    if (!isEligibleToShow) return;
    if (hasShownRef.current) return;
    if (hasScheduledRef.current) return;

    const shouldShow = await AsyncStorage.getItem('@show_access_code_modal');
    if (shouldShow !== 'true') return;

    const code = await AsyncStorage.getItem('@access_code');
    if (!code) return;

    setAccessCode(code);
    hasScheduledRef.current = true;

    // Сразу снимаем флаг, чтобы не было двойных показов при быстрых переходах
    await AsyncStorage.setItem('@show_access_code_modal', 'false');

    setTimeout(() => {
      setShowAccessCodeModal(true);
      runAccessCodeEnterAnimation();
      hasShownRef.current = true;
    }, 250);
  }, [isEligibleToShow, runAccessCodeEnterAnimation]);

  useEffect(() => {
    scheduleShowIfNeeded().catch((error) => {
      console.error('Error scheduling access code modal:', error);
    });
  }, [scheduleShowIfNeeded]);

  const handleCopyAccessCode = () => {
    try {
      Clipboard.setString(accessCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Скопировано', 'Код доступа скопирован в буфер обмена');
    } catch (error) {
      console.error('Error copying access code:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleCloseAccessCodeModal = () => {
    setShowAccessCodeModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCloseInfoModal = () => {
    setShowAccessCodeInfoModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const accessCodeModalAnimatedStyle = useAnimatedStyle(() => ({
    opacity: accessCodeModalOpacity.value,
    transform: [
      { translateY: accessCodeModalTranslateY.value },
      { scale: accessCodeModalScale.value },
    ],
  }));

  const accessCodeOverlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: accessCodeOverlayOpacity.value,
  }));

  const infoModalAnimatedStyle = useAnimatedStyle(() => ({
    opacity: infoModalOpacity.value,
    transform: [{ scale: infoModalScale.value }],
  }));

  const infoModalOverlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: infoModalOverlayOpacity.value,
  }));

  return (
    <>
      {/* Модальное окно с кодом доступа */}
      <Modal
        visible={showAccessCodeModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseAccessCodeModal}
      >
        <Animated.View style={[styles.accessCodeModalOverlay, accessCodeOverlayAnimatedStyle]}>
          <Animated.View style={[styles.accessCodeModalContent, accessCodeModalAnimatedStyle]}>
            <View style={styles.accessCodeIconContainer}>
              <View style={styles.accessCodeIconCircle}>
                <Ionicons name="key" size={32} color="#C9A89A" />
              </View>
            </View>

            <Text style={styles.accessCodeTitle}>Ваш код доступа</Text>

            <Text style={styles.accessCodeInstruction}>
              Сохраните этот код в безопасном месте. Он понадобится вам для входа в аккаунт при
              смене телефона или окончании сессии.
            </Text>

            <TouchableOpacity
              style={styles.accessCodeField}
              onPress={handleCopyAccessCode}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Скопировать код доступа"
            >
              <Text style={styles.accessCodeText}>{accessCode}</Text>
              <Ionicons name="copy-outline" size={20} color="#8B6F5F" />
            </TouchableOpacity>

            <Text style={styles.accessCodeCopyHint}>Нажмите на код, чтобы скопировать</Text>

            <TouchableOpacity
              style={styles.accessCodeWarning}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAccessCodeModal(false);
                setTimeout(() => {
                  setShowAccessCodeInfoModal(true);
                  runInfoEnterAnimation();
                }, 120);
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Зачем нужен код доступа"
            >
              <Ionicons name="information-circle" size={18} color="#8B6F5F" />
              <Text style={styles.accessCodeWarningText}>Обязательно запомните этот код!</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.accessCodeButton}
              onPress={handleCloseAccessCodeModal}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Понятно"
            >
              <Text style={styles.accessCodeButtonText}>Понятно</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Модальное окно с информацией о коде доступа */}
      <Modal
        visible={showAccessCodeInfoModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseInfoModal}
      >
        <Animated.View style={[styles.infoModalOverlay, infoModalOverlayAnimatedStyle]}>
          <Animated.View style={[styles.infoModalContent, infoModalAnimatedStyle]}>
            <View style={styles.infoModalHeader}>
              <Text style={styles.infoModalTitle}>Зачем нужен код доступа?</Text>
              <TouchableOpacity
                style={styles.infoModalCloseButton}
                onPress={handleCloseInfoModal}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Закрыть"
              >
                <Ionicons name="close" size={20} color="#8B6F5F" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.infoModalScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.infoModalScrollContent}
            >
              <View style={styles.infoModalSection}>
                <View style={styles.infoModalSectionRow}>
                  <View style={styles.infoModalIconContainer}>
                    <View style={styles.infoModalIconCircle}>
                      <Ionicons name="key" size={24} color="#C9A89A" />
                    </View>
                  </View>
                  <View style={styles.infoModalTextContainer}>
                    <Text style={styles.infoModalSectionTitle}>Важность кода доступа</Text>
                    <Text style={styles.infoModalSectionText}>
                      Код доступа — это ваш персональный пароль для входа в аккаунт. Он крайне важен
                      для безопасности ваших данных. Если вы захотите войти в свой аккаунт на другом
                      устройстве, вам обязательно нужно будет ввести этот код-пароль.
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.infoModalSection}>
                <View style={styles.infoModalSectionRow}>
                  <View style={styles.infoModalIconContainer}>
                    <View style={styles.infoModalIconCircle}>
                      <Ionicons name="phone-portrait" size={24} color="#C9A89A" />
                    </View>
                  </View>
                  <View style={styles.infoModalTextContainer}>
                    <Text style={styles.infoModalSectionTitle}>Ограничение устройств</Text>
                    <Text style={styles.infoModalSectionText}>
                      Ваш код доступа действует максимум на 4 устройствах. Это означает, что вы
                      сможете войти в аккаунт одновременно только на четырёх разных устройствах с
                      использованием этого кода.
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.infoModalSection}>
                <View style={styles.infoModalSectionRow}>
                  <View style={styles.infoModalIconContainer}>
                    <View style={styles.infoModalIconCircle}>
                      <Ionicons name="save" size={24} color="#C9A89A" />
                    </View>
                  </View>
                  <View style={styles.infoModalTextContainer}>
                    <Text style={styles.infoModalSectionTitle}>Сохранение кода</Text>
                    <Text style={styles.infoModalSectionText}>
                      Обязательно запомните ваш код доступа. Он хранится в разделе &quot;Профиль&quot;,
                      но мы настоятельно рекомендуем также записать его в надёжном месте. Если по
                      каким-либо причинам вы забудете код, мы не сможем вам его подсказать или
                      восстановить.
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.infoModalButton}
              onPress={handleCloseInfoModal}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Понятно"
            >
              <Text style={styles.infoModalButtonText}>Понятно</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  accessCodeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  accessCodeModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  accessCodeIconContainer: {
    marginBottom: 20,
  },
  accessCodeIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F0E8E0',
  },
  accessCodeTitle: {
    fontSize: 24,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    marginBottom: 16,
    textAlign: 'center',
  },
  accessCodeInstruction: {
    fontSize: 15,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  accessCodeField: {
    width: '100%',
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#F0E8E0',
    marginBottom: 12,
  },
  accessCodeText: {
    fontSize: 28,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    letterSpacing: 2,
  },
  accessCodeCopyHint: {
    fontSize: 13,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 16,
  },
  accessCodeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
    width: '100%',
    gap: 8,
  },
  accessCodeWarningText: {
    fontSize: 14,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '500',
    flex: 1,
  },
  accessCodeButton: {
    width: '100%',
    backgroundColor: '#C9A89A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  accessCodeButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  infoModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  infoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  infoModalTitle: {
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
    paddingRight: 12,
  },
  infoModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoModalScrollView: {
    maxHeight: 400,
  },
  infoModalScrollContent: {
    paddingBottom: 16,
    paddingTop: 8,
  },
  infoModalSection: {
    marginBottom: 24,
    width: '100%',
  },
  infoModalSectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  infoModalIconContainer: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  infoModalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F0E8E0',
  },
  infoModalTextContainer: {
    flex: 1,
    flexShrink: 1,
  },
  infoModalSectionTitle: {
    fontSize: 17,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'left',
  },
  infoModalSectionText: {
    fontSize: 15,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    lineHeight: 22,
    textAlign: 'left',
    marginTop: 4,
  },
  infoModalButton: {
    width: '100%',
    backgroundColor: '#C9A89A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  infoModalButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
});











