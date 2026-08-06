import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { colors, radii, spacing } from '@/constants/design-tokens';

type PagePreviewLoadingOverlayProps = {
  /** Короткая подпись под скелетоном */
  label?: string;
};

/**
 * Полноэкранный оверлей макета страницы: не «пустой белый лист»,
 * а мягкий skeleton + подпись, пока фон ещё грузится.
 */
export function PagePreviewLoadingOverlay({
  label = 'Загрузка макета…',
}: PagePreviewLoadingOverlayProps) {
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.85, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <View
      style={styles.overlay}
      pointerEvents="none"
      accessibilityLabel={label}
      accessibilityRole="progressbar"
    >
      <View style={styles.sheet}>
        <Animated.View style={[styles.blockTitle, pulseStyle]} />
        <Animated.View style={[styles.blockLine, styles.lineWide, pulseStyle]} />
        <Animated.View style={[styles.blockLine, styles.lineMid, pulseStyle]} />
        <Animated.View style={[styles.blockLine, styles.lineShort, pulseStyle]} />
        <View style={styles.gap} />
        <Animated.View style={[styles.blockPhoto, pulseStyle]} />
        <View style={styles.gap} />
        <Animated.View style={[styles.blockLine, styles.lineWide, pulseStyle]} />
        <Animated.View style={[styles.blockLine, styles.lineMid, pulseStyle]} />
      </View>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  sheet: {
    width: '78%',
    maxWidth: 280,
    aspectRatio: 0.72,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: 10,
    justifyContent: 'flex-start',
  },
  blockTitle: {
    height: 16,
    width: '55%',
    borderRadius: 6,
    backgroundColor: '#E8DADF',
    alignSelf: 'center',
    marginBottom: 8,
  },
  blockLine: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EDE4E8',
  },
  lineWide: { width: '100%' },
  lineMid: { width: '88%' },
  lineShort: { width: '64%' },
  blockPhoto: {
    width: '100%',
    height: 72,
    borderRadius: radii.sm,
    backgroundColor: '#E8DADF',
  },
  gap: { height: 6 },
  label: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
