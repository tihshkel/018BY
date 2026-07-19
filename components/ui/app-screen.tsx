import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  Keyboard,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/design-tokens';
import {
  getTabletContentShell,
  getTabletSectionWrap,
  ONBOARDING_CONTENT_MAX_WIDTH,
  useResponsiveLayout,
} from '@/utils/responsive';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type AppScreenScrollContextValue = {
  scrollToField: (fieldRef: RefObject<View | null>) => void;
};

const AppScreenScrollContext = createContext<AppScreenScrollContextValue | null>(null);

export function useAppScreenScrollToField() {
  return useContext(AppScreenScrollContext)?.scrollToField;
}

/** Ref + onFocus для полей вне PageFormFields (кастомные формы альбома). */
export function useKeyboardAwareFieldRef() {
  const fieldRef = useRef<View>(null);
  const scrollToField = useAppScreenScrollToField();
  const onInputFocus = useCallback(() => {
    scrollToField?.(fieldRef);
  }, [scrollToField]);
  return { fieldRef, onInputFocus };
}

export interface AppScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  keyboardAware?: boolean;
  /** Extra space reserved above the keyboard (footer button inside scroll, e.g. «Просмотр страницы»). */
  keyboardFooterOffset?: number;
  edges?: Edge[];
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  /** Center content on tablet with max-width column. */
  tabletShell?: boolean;
  contentMaxWidth?: number;
}

const DEFAULT_KEYBOARD_FOOTER_OFFSET = 72;

/** Короткий «дожим» после появления клавиатуры — без серии рывков (Android: один pass). */
const KEYBOARD_SCROLL_DELAYS_MS =
  Platform.OS === 'ios' ? [80, 280] : [160];

export function AppScreen({
  children,
  scroll = false,
  keyboardAware,
  keyboardFooterOffset = DEFAULT_KEYBOARD_FOOTER_OFFSET,
  edges = ['top', 'bottom'],
  contentContainerStyle,
  style,
  tabletShell = false,
  contentMaxWidth,
}: AppScreenProps) {
  const isKeyboardAware = keyboardAware ?? scroll;
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const layout = useResponsiveLayout(contentMaxWidth ?? ONBOARDING_CONTENT_MAX_WIDTH);
  const tabletShellStyle = tabletShell
    ? (getTabletContentShell(layout) ?? getTabletSectionWrap(layout, spacing.md))
    : undefined;
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const pendingFieldRef = useRef<View | null>(null);
  const scrollTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const clearScrollTimeouts = useCallback(() => {
    for (const timeoutId of scrollTimeoutsRef.current) {
      clearTimeout(timeoutId);
    }
    scrollTimeoutsRef.current = [];
  }, []);

  const performScrollToField = useCallback(
    (field: View | null) => {
      if (!field || !scrollRef.current) return;
      const keyboardHeight = keyboardHeightRef.current;
      if (keyboardHeight <= 0) return;

      field.measureInWindow((_x, y, _width, height) => {
        // Клавиатура оверлеем (iOS и Android edge-to-edge / pan) — вычитаем её высоту.
        // Небольшой зазор, как на iOS, чтобы поле и тулбар не прилипали к клавиатуре.
        const comfortGap = spacing.lg;
        const visibleBottom =
          windowHeight - keyboardHeight - keyboardFooterOffset - comfortGap;
        const fieldBottom = y + height;

        if (fieldBottom <= visibleBottom) return;

        const delta = fieldBottom - visibleBottom + spacing.sm;
        scrollRef.current?.scrollTo({
          y: Math.max(0, scrollOffsetRef.current + delta),
          animated: true,
        });
      });
    },
    [keyboardFooterOffset, windowHeight],
  );

  const scheduleScrollToField = useCallback(
    (field: View | null) => {
      if (!field) return;
      clearScrollTimeouts();
      for (const delayMs of KEYBOARD_SCROLL_DELAYS_MS) {
        const timeoutId = setTimeout(() => {
          performScrollToField(field);
        }, delayMs);
        scrollTimeoutsRef.current.push(timeoutId);
      }
    },
    [clearScrollTimeouts, performScrollToField],
  );

  const scrollToField = useCallback(
    (fieldRef: RefObject<View | null>) => {
      pendingFieldRef.current = fieldRef.current;
      scheduleScrollToField(fieldRef.current);
    },
    [scheduleScrollToField],
  );

  useEffect(() => {
    if (!isKeyboardAware) return;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const height = event.endCoordinates.height;
      keyboardHeightRef.current = height;
      try {
        Keyboard.scheduleLayoutAnimation(event);
      } catch {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setKeyboardInset(height);
      if (pendingFieldRef.current) {
        scheduleScrollToField(pendingFieldRef.current);
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, (event) => {
      keyboardHeightRef.current = 0;
      clearScrollTimeouts();
      try {
        Keyboard.scheduleLayoutAnimation(event);
      } catch {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setKeyboardInset(0);
      pendingFieldRef.current = null;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      clearScrollTimeouts();
    };
  }, [clearScrollTimeouts, isKeyboardAware, scheduleScrollToField]);

  useEffect(() => {
    if (!isKeyboardAware || keyboardInset <= 0 || !pendingFieldRef.current) return;
    scheduleScrollToField(pendingFieldRef.current);
  }, [isKeyboardAware, keyboardInset, scheduleScrollToField]);

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

    const baseBottom = Math.max(existingBottom, spacing.xl, insets.bottom + spacing.lg);
    const keyboardPadding =
      keyboardInset > 0 ? keyboardInset + keyboardFooterOffset : 0;

    return {
      paddingBottom: baseBottom + keyboardPadding,
    };
  }, [contentContainerStyle, insets.bottom, isKeyboardAware, keyboardFooterOffset, keyboardInset]);

  const screenEdges = isKeyboardAware ? (['top'] as Edge[]) : edges;
  const screenChildren = tabletShellStyle ? (
    <View style={[styles.tabletShell, tabletShellStyle]}>{children}</View>
  ) : (
    children
  );

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
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets={isKeyboardAware && Platform.OS === 'ios'}
        onScroll={isKeyboardAware ? handleScroll : undefined}
        scrollEventThrottle={16}
      >
        {screenChildren}
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
      <View style={[styles.content, contentContainerStyle]}>{screenChildren}</View>
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
  tabletShell: {
    flexGrow: 1,
  },
});
