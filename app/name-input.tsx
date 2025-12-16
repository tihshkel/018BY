import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NameInputScreen() {
  const [name, setName] = useState('');
  const [showGreeting, setShowGreeting] = useState(false);
  const containerOpacity = useSharedValue(0);
  const greetingOpacity = useSharedValue(0);

  useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 400 });
  }, []);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const handleContinue = async () => {
    if (name.trim().length === 0) {
      return;
    }

    // Скрываем клавиатуру перед запуском анимации
    Keyboard.dismiss();

    try {
      const trimmedName = name.trim();
      await AsyncStorage.setItem('@user_name', trimmedName);
      await AsyncStorage.setItem('@is_activated', 'true');
      setShowGreeting(true);
      greetingOpacity.value = withTiming(1, { duration: 350 });
      setTimeout(() => {
        greetingOpacity.value = withTiming(0, { duration: 250 });
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 260);
      }, 1000);
    } catch (error) {
      console.error('Error saving name:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#F5F0EB', '#FAF8F5', '#F5F0EB']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.content, containerAnimatedStyle]}>
            <View style={styles.header}>
              <Text style={styles.title}>Как вас зовут?</Text>
              <Text style={styles.subtitle}>
                Мы хотим знать, как обращаться к вам в приложении
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Введите ваше имя"
                placeholderTextColor="#B8A89A"
                autoFocus
                autoCapitalize="words"
                autoCorrect={false}
                onSubmitEditing={handleContinue}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.continueButton,
                name.trim().length > 0 && styles.continueButtonActive,
              ]}
              onPress={handleContinue}
              activeOpacity={0.7}
              disabled={name.trim().length === 0}
            >
              <Text
                style={[
                  styles.continueButtonText,
                  name.trim().length > 0 && styles.continueButtonTextActive,
                ]}
              >
                Продолжить
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Animated.View
        pointerEvents={showGreeting ? 'auto' : 'none'}
        style={[styles.greetingOverlay, { opacity: greetingOpacity }]}
      >
        <LinearGradient
          colors={['rgba(250, 248, 245, 0.98)', 'rgba(245, 239, 233, 0.98)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.greetingContent}>
          <Text style={styles.greetingTitle}>Добро пожаловать</Text>
          <Text style={styles.greetingName}>{name.trim()}</Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    minHeight: '100%',
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
    width: '100%',
  },
  title: {
    fontSize: 32,
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
  subtitle: {
    fontSize: 16,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    textAlign: 'center',
    opacity: 0.8,
    paddingHorizontal: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 32,
  },
  input: {
    width: '100%',
    height: 60,
    borderWidth: 2,
    borderColor: '#D4C4B5',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    fontSize: 19,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  continueButton: {
    backgroundColor: '#E8DAD0',
    paddingVertical: 18,
    paddingHorizontal: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 220,
    opacity: 0.5,
  },
  continueButtonActive: {
    backgroundColor: '#C9A89A',
    opacity: 1,
    shadowColor: '#8B6F5F',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  continueButtonText: {
    color: '#B8A89A',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  continueButtonTextActive: {
    color: '#FFFFFF',
  },
  greetingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  greetingContent: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  greetingTitle: {
    fontSize: 28,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
  },
  greetingName: {
    fontSize: 40,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
});

