import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { AppBottomSheet, AppButton } from '@/components/ui';
import {
  DEFAULT_AVATARS,
  getPresetAvatarIdFromStorage,
  isPresetAvatarValue,
} from '@/constants/default-avatars';
import { colors } from '@/constants/design-tokens';

type AvatarPickerSheetProps = {
  visible: boolean;
  currentAvatar: string | null;
  onClose: () => void;
  onSelectPreset: (presetId: string) => void;
  onPickFromGallery: () => void;
  isSaving?: boolean;
};

export function AvatarPickerSheet({
  visible,
  currentAvatar,
  onClose,
  onSelectPreset,
  onPickFromGallery,
  isSaving = false,
}: AvatarPickerSheetProps) {
  const selectedPresetId =
    currentAvatar && isPresetAvatarValue(currentAvatar)
      ? getPresetAvatarIdFromStorage(currentAvatar)
      : null;

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title="Фото профиля"
      subtitle="Выберите один из вариантов или загрузите своё фото"
      scroll={false}
      footer={
        <AppButton
          title="Загрузить из галереи"
          onPress={onPickFromGallery}
          disabled={isSaving}
          loading={isSaving}
        />
      }
    >
      <View style={styles.grid}>
        {DEFAULT_AVATARS.map((avatar) => {
          const isSelected = selectedPresetId === avatar.id;

          return (
            <Pressable
              key={avatar.id}
              style={styles.avatarWrap}
              onPress={() => onSelectPreset(avatar.id)}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel={`Аватар ${avatar.id}`}
              accessibilityState={{ selected: isSelected }}
            >
              <View style={[styles.avatarClip, isSelected && styles.avatarClipSelected]}>
                <ExpoImage
                  source={avatar.source}
                  style={styles.avatarImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </View>
              {isSelected ? (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </AppBottomSheet>
  );
}

const AVATAR_SIZE = 88;

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    paddingBottom: 8,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    position: 'relative',
  },
  avatarClip: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  avatarClipSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  selectedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
