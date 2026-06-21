import React from 'react';
import {
  Modal,
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

export interface AppCenterModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  dismissOnBackdrop?: boolean;
  maxWidth?: number;
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  showClose?: boolean;
}

export function AppCenterModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  dismissOnBackdrop = true,
  maxWidth = FORM_MODAL_MAX_WIDTH,
  scroll = false,
  contentContainerStyle,
  showClose = true,
}: AppCenterModalProps) {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout(maxWidth);
  const tabletModal = getTabletBottomModalStyles(layout);

  if (!visible) return null;

  const body = scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : children ? (
    <View style={[styles.body, contentContainerStyle]}>{children}</View>
  ) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[
          styles.overlay,
          tabletModal.overlay,
          {
            paddingTop: Math.max(insets.top, spacing.md),
            paddingBottom: Math.max(insets.bottom, spacing.md),
          },
        ]}
      >
        <Pressable
          style={styles.backdrop}
          onPress={dismissOnBackdrop ? onClose : undefined}
          accessibilityRole="button"
          accessibilityLabel="Закрыть"
        />

        <View
          style={[
            styles.card,
            { maxWidth: layout.contentMaxWidth },
            tabletModal.content,
          ]}
        >
          <AppModalHeader
            title={title}
            subtitle={subtitle}
            onClose={onClose}
            showClose={showClose}
          />
          {body}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  card: {
    width: '100%',
    backgroundColor: surfaces.elevated,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    ...createShadow('md'),
  },
  scroll: {
    flexGrow: 0,
    maxHeight: 360,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
