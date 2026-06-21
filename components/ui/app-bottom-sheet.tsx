import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppModalHeader } from '@/components/ui/app-modal-header';
import {
  colors,
  createShadow,
  radii,
  spacing,
  surfaces,
} from '@/constants/design-tokens';
import {
  FORM_MODAL_MAX_WIDTH,
  getTabletBottomModalStyles,
  useResponsiveLayout,
} from '@/utils/responsive';

export interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  size?: 'auto' | 'large';
  showHandle?: boolean;
  dismissOnBackdrop?: boolean;
  showClose?: boolean;
  /** Поднимает sheet над клавиатурой (нужно для TextInput на Android). */
  keyboardAvoiding?: boolean;
}

export function AppBottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  scroll = true,
  contentContainerStyle,
  size = 'auto',
  showHandle = true,
  dismissOnBackdrop = true,
  showClose = true,
  keyboardAvoiding = false,
}: AppBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout(FORM_MODAL_MAX_WIDTH);
  const tabletModal = getTabletBottomModalStyles(layout);

  if (!visible) return null;

  // Android: windowSoftInputMode=adjustResize уже сжимает окно — KAV даёт двойной сдвиг и «прыжки».
  const keyboardAvoidingEnabled = keyboardAvoiding && Platform.OS === 'ios';

  const body = scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.body, contentContainerStyle]}>
      {children}
    </View>
  );

  const sheet = (
    <View
      style={[
        styles.sheet,
        size === 'large' && styles.sheetLarge,
        layout.isTablet && styles.sheetTablet,
        tabletModal.content,
        { paddingBottom: Math.max(insets.bottom, spacing.md) },
      ]}
    >
      {!layout.isTablet && showHandle ? <View style={styles.handle} /> : null}
      {title ? (
        <AppModalHeader
          title={title}
          subtitle={subtitle}
          onClose={onClose}
          showClose={showClose}
        />
      ) : null}
      {body}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={layout.isTablet ? 'fade' : 'slide'}
      onRequestClose={dismissOnBackdrop ? onClose : () => {}}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.overlayRoot, tabletModal.overlay]}
        enabled={keyboardAvoidingEnabled}
      >
        <Pressable
          style={styles.backdrop}
          onPress={dismissOnBackdrop ? onClose : undefined}
          accessibilityRole="button"
          accessibilityLabel="Закрыть"
        />

        {sheet}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: surfaces.sheet,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '92%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderBottomWidth: 0,
    ...createShadow('lg'),
  },
  sheetLarge: {
    maxHeight: '96%',
  },
  sheetTablet: {
    borderRadius: radii.xl,
    alignSelf: 'center',
    width: '100%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  body: {
    paddingHorizontal: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
