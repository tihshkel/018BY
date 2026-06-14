import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type RefObject,
} from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/design-tokens';

type AppScreenScrollContextValue = {
  scrollToField: (fieldRef: RefObject<View | null>) => void;
};

const AppScreenScrollContext = createContext<AppScreenScrollContextValue | null>(null);

export function useAppScreenScrollToField() {
  return useContext(AppScreenScrollContext)?.scrollToField;
}

export interface AppScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  keyboardAware?: boolean;
  edges?: Edge[];
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

const KEYBOARD_SCROLL_DELAY_MS = Platform.OS === 'ios' ? 100 : 50;

export function AppScreen({
  children,
  scroll = false,
  keyboardAware,
  edges = ['top', 'bottom'],
  contentContainerStyle,
  style,
}: AppScreenProps) {
  const isKeyboardAware = keyboardAware ?? scroll;
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const pendingFieldRef = useRef<View | null>(null);

  const performScrollToField = useCallback((field: View | null) => {
    if (!field || !scrollRef.current || keyboardHeightRef.current <= 0) return;

    field.measureInWindow((_x, y, _width, height) => {
      const windowHeight = Dimensions.get('window').height;
      const visibleBottom = windowHeight - keyboardHeightRef.current - spacing.md;
      const fieldBottom = y + height;

      if (fieldBottom <= visibleBottom) return;

      const delta = fieldBottom - visibleBottom + spacing.md;
      scrollRef.current?.scrollTo({
        y: scrollOffsetRef.current + delta,
        animated: true,
      });
    });
  }, []);

  const scrollToField = useCallback((fieldRef: RefObject<View | null>) => {
    pendingFieldRef.current = fieldRef.current;
    if (keyboardHeightRef.current > 0) {
      setTimeout(() => performScrollToField(fieldRef.current), KEYBOARD_SCROLL_DELAY_MS);
    }
  }, [performScrollToField]);

  useEffect(() => {
    if (!isKeyboardAware) return;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      keyboardHeightRef.current = event.endCoordinates.height;
      if (pendingFieldRef.current) {
        setTimeout(
          () => performScrollToField(pendingFieldRef.current),
          KEYBOARD_SCROLL_DELAY_MS,
        );
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
      pendingFieldRef.current = null;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [isKeyboardAware, performScrollToField]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  const scrollContextValue = useMemo(
    () => (isKeyboardAware ? { scrollToField } : null),
    [isKeyboardAware, scrollToField],
  );

  const scrollContentPadding = useMemo(() => {
    if (!isKeyboardAware) return undefined;

    const flattened = StyleSheet.flatten(contentContainerStyle);
    const existingBottom =
      typeof flattened?.paddingBottom === 'number' ? flattened.paddingBottom : 0;

    return {
      paddingBottom: Math.max(existingBottom, spacing.xl, insets.bottom + spacing.lg),
    };
  }, [contentContainerStyle, insets.bottom, isKeyboardAware]);

  const screenEdges = isKeyboardAware ? (['top'] as Edge[]) : edges;

  if (scroll) {
    const scrollView = (
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          contentContainerStyle,
          scrollContentPadding,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={isKeyboardAware}
        onScroll={isKeyboardAware ? handleScroll : undefined}
        scrollEventThrottle={16}
      >
        {children}
      </ScrollView>
    );

    return (
      <SafeAreaView style={[styles.safe, style]} edges={screenEdges}>
        {scrollContextValue ? (
          <AppScreenScrollContext.Provider value={scrollContextValue}>
            {scrollView}
          </AppScreenScrollContext.Provider>
        ) : (
          scrollView
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      <View style={[styles.content, contentContainerStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
