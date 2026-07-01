import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AVAILABLE_FONTS, getAlbumFontFamilyName, normalizeAlbumFontId } from "@/constants/album-fonts";
import { AppText } from "@/components/ui/app-text";
import { colors, radii, spacing } from "@/constants/design-tokens";

type PageFontPickerProps = {
  value: string;
  onChange: (fontId: string) => void;
};

function getPreviewFontFamily(fontId: string): string | undefined {
  return getAlbumFontFamilyName(fontId);
}

export function PageFontPicker({ value, onChange }: PageFontPickerProps) {
  return (
    <View style={styles.wrap}>
      <AppText variant="caption" style={styles.label}>
        Шрифт текста на странице
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {AVAILABLE_FONTS.map((font) => {
          const selected = value === font.id;
          return (
            <Pressable
              key={font.id}
              onPress={() => onChange(normalizeAlbumFontId(font.id))}
              style={[styles.chip, selected && styles.chipSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={font.displayName}
            >
              <AppText
                variant="caption"
                style={[
                  styles.chipText,
                  { fontFamily: getPreviewFontFamily(font.id) },
                  selected && styles.chipTextSelected,
                ]}
              >
                {font.displayName}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    gap: spacing.xs,
  },
  label: {
    color: colors.textSecondary,
    marginLeft: 2,
  },
  row: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 18,
  },
  chipTextSelected: {
    color: colors.primaryPressed,
    fontWeight: "600",
  },
});
