import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';

const AnimatedView = Animated.createAnimatedComponent(View);

export function CustomTabButton(props: BottomTabBarButtonProps) {
  const { children, onPress, accessibilityState } = props;
  const isFocused = accessibilityState?.selected ?? false;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: withTiming(isFocused ? 1 : 0.7, { duration: 200 }),
    };
  });

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isFocused ? 1 : 0, { duration: 200 }),
      transform: [
        {
          scaleX: withSpring(isFocused ? 1 : 0, {
            damping: 12,
            stiffness: 200,
          }),
        },
      ],
    };
  });

  const handlePressIn = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <PlatformPressable
      {...props}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.container}
    >
      <AnimatedView style={[styles.content, animatedStyle]}>
        <AnimatedView style={[styles.indicator, indicatorStyle]} />
        {children}
      </AnimatedView>
    </PlatformPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    paddingTop: 2,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 40,
    height: 3,
    backgroundColor: '#C9A89A',
    borderRadius: 3,
  },
});

