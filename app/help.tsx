import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface HelpItem {
  id: string;
  question: string;
  answer: string;
}

const helpItems: HelpItem[] = [
  {
    id: '1',
    question: 'Как добавить фото?',
    answer: 'Нажмите на кнопку "Фото" в нижней панели редактора. Вы сможете выбрать изображение из галереи или сделать новый снимок. Фото автоматически добавятся на текущую страницу.',
  },
  {
    id: '2',
    question: 'Как экспортировать в PDF?',
    answer: 'Нажмите на кнопку "Экспорт" в нижней панели редактора. Выберите формат печати (твёрдая или мягкая обложка) и нажмите "Создать PDF". После генерации вы сможете скачать, отправить или распечатать файл.',
  },
  {
    id: '3',
    question: 'Что делать, если не приходят напоминания?',
    answer: 'Проверьте настройки уведомлений в профиле. Убедитесь, что вы указали дату события при создании проекта. Напоминания приходят за несколько дней до важных дат.',
  },
  {
    id: '4',
    question: 'Как скрыть раздел проекта?',
    answer: 'В боковой панели редактора нажмите на иконку глаза рядом с названием раздела. Раздел будет скрыт, но не удалён. Вы можете вернуть его, нажав на иконку глаза снова.',
  },
  {
    id: '5',
    question: 'Можно ли изменить размер фото?',
    answer: 'Да, фото можно перетаскивать и изменять размер, удерживая углы изображения. Это позволяет оптимально разместить фото на странице.',
  },
];

export default function HelpScreen() {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={[styles.content, animatedStyle]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#8B6F5F" />
          </TouchableOpacity>
          <Text style={styles.title}>Помощь</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {helpItems.map((item) => (
            <View key={item.id} style={styles.helpItem}>
              <View style={styles.questionContainer}>
                <Ionicons name="help-circle" size={24} color="#C9A89A" />
                <Text style={styles.question}>{item.question}</Text>
              </View>
              <Text style={styles.answer}>{item.answer}</Text>
            </View>
          ))}
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    fontSize: 28,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  helpItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#F0E8E0',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  question: {
    flex: 1,
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '500',
  },
  answer: {
    fontSize: 15,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    lineHeight: 24,
  },
});

