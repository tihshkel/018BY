import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';

export function CustomTabButton(props: BottomTabBarButtonProps) {
  const { children, onPress, onLongPress, accessibilityState, style, ...pressableProps } = props;
  const isFocused = accessibilityState?.selected ?? false;

  const handlePressIn = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <PlatformPressable
      {...pressableProps}
      accessibilityState={accessibilityState}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      hitSlop={styles.hitSlop}
      pressRetentionOffset={styles.pressRetentionOffset}
      style={[style, styles.container]}
    >
      <View style={[styles.content, { opacity: isFocused ? 1 : 0.7 }]}>
        {isFocused ? <View style={styles.indicator} /> : null}
        {children}
      </View>
    </PlatformPressable>
  );
}

const styles = StyleSheet.create({
  hitSlop: {
    top: 8,
    right: 6,
    bottom: 8,
    left: 6,
  },
  pressRetentionOffset: {
    top: 12,
    right: 12,
    bottom: 12,
    left: 12,
  },
  container: {
    flex: 1,
    minHeight: 48,
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
