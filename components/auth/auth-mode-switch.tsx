import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors } from '@/constants/design-tokens';

export type AuthMode = 'login' | 'register';

type AuthModeSwitchProps = {
  value: AuthMode;
  onChange: (value: AuthMode) => void;
  disabled?: boolean;
};

export function AuthModeSwitch({ value, onChange, disabled = false }: AuthModeSwitchProps) {
  const position = useRef(new Animated.Value(value === 'register' ? 1 : 0)).current;
  const [segmentWidth, setSegmentWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const animation = Animated.timing(position, {
      toValue: value === 'register' ? 1 : 0,
      duration: reduceMotion ? 0 : 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [position, reduceMotion, value]);

  return (
    <View
      style={styles.track}
      accessibilityRole="tablist"
      accessibilityLabel="Вход или регистрация"
      onLayout={({ nativeEvent }) => setSegmentWidth(Math.max(0, (nativeEvent.layout.width - 6) / 2))}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.thumb,
            {
              width: segmentWidth,
              transform: [{
                translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, segmentWidth] }),
              }],
            },
          ]}
        />
      ) : null}
      {(['login', 'register'] as const).map((mode) => (
        <Pressable
          key={mode}
          testID={`auth-mode-${mode}`}
          disabled={disabled}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === mode, disabled }}
          onPress={() => { if (mode !== value) onChange(mode); }}
          style={styles.segment}
        >
          <AppText variant="bodySm" style={[styles.label, value === mode && styles.labelSelected]}>
            {mode === 'login' ? 'Вход' : 'Регистрация'}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 14, backgroundColor: '#F7F5F6', padding: 3, marginBottom: 12 },
  thumb: {
    position: 'absolute',
    left: 3,
    top: 3,
    bottom: 3,
    borderRadius: 11,
    backgroundColor: colors.white,
    shadowColor: '#57313C',
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  label: { color: '#897C83', fontWeight: '500' },
  labelSelected: { color: '#46333D', fontWeight: '600' },
});
