import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface SkeletonBlockProps {
  width: string | number;
  height: number;
  delay?: number;
  style?: any;
}

const SkeletonBlock = ({ width, height, delay = 0, style }: SkeletonBlockProps) => {
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0.7, {
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );
  }, [opacity, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: typeof width === 'string' ? width : width,
          height: height,
          backgroundColor: '#E5E5E5',
          borderRadius: 4,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

export default function PdfSkeletonLoader() {
  return (
    <View style={styles.container}>
      {/* Белая страница с эффектом тени */}
      <View style={styles.page}>
        <View style={styles.content}>
          {/* Верхняя часть - заголовок */}
          <View style={styles.headerSection}>
            <SkeletonBlock width="60%" height={20} delay={0} style={styles.titleBlock} />
            <SkeletonBlock width="40%" height={16} delay={100} style={styles.subtitleBlock} />
          </View>

          <View style={styles.spacer} />

          {/* Параграф 1 */}
          <View style={styles.paragraph}>
            <SkeletonBlock width="95%" height={14} delay={200} style={styles.line} />
            <SkeletonBlock width="88%" height={14} delay={250} style={styles.line} />
            <SkeletonBlock width="92%" height={14} delay={300} style={styles.line} />
            <SkeletonBlock width="75%" height={14} delay={350} style={styles.line} />
          </View>

          <View style={styles.spacer} />

          {/* Параграф 2 */}
          <View style={styles.paragraph}>
            <SkeletonBlock width="90%" height={14} delay={400} style={styles.line} />
            <SkeletonBlock width="85%" height={14} delay={450} style={styles.line} />
            <SkeletonBlock width="78%" height={14} delay={500} style={styles.line} />
          </View>

          <View style={styles.spacer} />

          {/* Параграф 3 с подзаголовком */}
          <View style={styles.paragraph}>
            <SkeletonBlock width="50%" height={18} delay={550} style={styles.subheading} />
            <View style={styles.spacerSmall} />
            <SkeletonBlock width="93%" height={14} delay={600} style={styles.line} />
            <SkeletonBlock width="87%" height={14} delay={650} style={styles.line} />
            <SkeletonBlock width="91%" height={14} delay={700} style={styles.line} />
            <SkeletonBlock width="82%" height={14} delay={750} style={styles.line} />
          </View>

          <View style={styles.spacer} />

          {/* Параграф 4 */}
          <View style={styles.paragraph}>
            <SkeletonBlock width="88%" height={14} delay={800} style={styles.line} />
            <SkeletonBlock width="76%" height={14} delay={850} style={styles.line} />
            <SkeletonBlock width="90%" height={14} delay={900} style={styles.line} />
            <SkeletonBlock width="84%" height={14} delay={950} style={styles.line} />
            <SkeletonBlock width="70%" height={14} delay={1000} style={styles.line} />
          </View>

          <View style={styles.spacer} />

          {/* Параграф 5 */}
          <View style={styles.paragraph}>
            <SkeletonBlock width="92%" height={14} delay={1050} style={styles.line} />
            <SkeletonBlock width="79%" height={14} delay={1100} style={styles.line} />
            <SkeletonBlock width="86%" height={14} delay={1150} style={styles.line} />
          </View>

          {/* Имитация изображения или блока */}
          <View style={styles.imageBlock}>
            <SkeletonBlock width="100%" height={120} delay={1200} style={styles.imagePlaceholder} />
          </View>

          <View style={styles.spacer} />

          {/* Последний параграф */}
          <View style={styles.paragraph}>
            <SkeletonBlock width="89%" height={14} delay={1250} style={styles.line} />
            <SkeletonBlock width="83%" height={14} delay={1300} style={styles.line} />
            <SkeletonBlock width="91%" height={14} delay={1350} style={styles.line} />
            <SkeletonBlock width="77%" height={14} delay={1400} style={styles.line} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  page: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  content: {
    padding: 32,
    paddingTop: 40,
    flex: 1,
  },
  headerSection: {
    marginBottom: 24,
  },
  titleBlock: {
    marginBottom: 12,
  },
  subtitleBlock: {
    marginTop: 4,
  },
  paragraph: {
    marginBottom: 8,
  },
  line: {
    marginBottom: 8,
  },
  subheading: {
    marginBottom: 4,
  },
  spacer: {
    height: 24,
    marginBottom: 8,
  },
  spacerSmall: {
    height: 12,
    marginBottom: 4,
  },
  imageBlock: {
    marginVertical: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    borderRadius: 8,
  },
});

