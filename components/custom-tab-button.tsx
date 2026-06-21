import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';

export function CustomTabButton(props: BottomTabBarButtonProps) {
  const { children, onPress, accessibilityState } = props;
  const isFocused = accessibilityState?.selected ?? false;

  const handlePressIn = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <PlatformPressable
      {...props}
      onPress={onPress}
      onPressIn={handlePressIn}
      style={styles.container}
    >
      <View style={[styles.content, { opacity: isFocused ? 1 : 0.7 }]}>
        {isFocused ? <View style={styles.indicator} /> : null}
        {children}
      </View>
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
