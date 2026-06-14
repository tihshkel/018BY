import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { AppHeader, AppScreen, AppText } from "@/components/ui";
import {
    colors,
    createShadow,
    radii,
    spacing,
} from "@/constants/design-tokens";
import { useAlbumFormLayout } from "@/hooks/use-album-editor-layout";
import { useAlbumProject } from "@/hooks/use-album-project";
import { navigateToAlbumPages, type AlbumFlowParams } from "@/utils/albumNavigation";

type AddOption = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const OPTIONS: AddOption[] = [
  {
    id: "repeat",
    title: "Повторить текущий шаблон",
    description: "Добавить страницу с тем же макетом",
    icon: "copy-outline",
  },
  {
    id: "photo",
    title: "Фото-страница",
    description: "Страница только для фотографий",
    icon: "image-outline",
  },
  {
    id: "free",
    title: "Свободная страница",
    description: "Фото, подписи и заметки",
    icon: "create-outline",
  },
  {
    id: "library",
    title: "Из библиотеки шаблонов",
    description: "Выберите готовый макет",
    icon: "grid-outline",
  },
];

export default function AlbumAddPageScreen() {
  const { id, celebration, coverType, interiorType, afterIndex } =
    useLocalSearchParams<{
      id?: string;
      celebration?: string;
      coverType?: string;
      interiorType?: string;
      afterIndex?: string;
    }>();

  const project = useAlbumProject({
    projectId: id,
    celebration,
    coverType,
    interiorType,
  });
  const { shellStyle } = useAlbumFormLayout();

  const albumFlowParams: AlbumFlowParams = {
    id,
    celebration,
    coverType,
    interiorType,
  };

  const insertAfter = afterIndex
    ? Number(afterIndex)
    : project.instances.length - 1;

  const handleOption = async (optionId: string) => {
    if (!project.projectId) return;

    if (optionId === "library") {
      router.push({
        pathname: "/album-template-library",
        params: {
          id,
          celebration,
          coverType,
          interiorType,
          afterIndex: String(insertAfter),
        },
      } as unknown as Href);
      return;
    }

    const lastInstance =
      project.instances[insertAfter] ??
      project.instances[project.instances.length - 1];
    const sourcePageIndex = lastInstance
      ? lastInstance.sourcePageNumber - 1
      : 0;

    if (optionId === "repeat" && lastInstance) {
      await project.addPage({
        insertAfterIndex: insertAfter,
        sourcePageIndex: lastInstance.sourcePageNumber - 1,
        titleOverride: `${project.getInstanceTitle(lastInstance)} (копия)`,
      });
    } else if (optionId === "photo") {
      const photoSourceIndex = Math.max(
        0,
        project.instances.findIndex((i) => {
          const s = project.getSchemaForInstance(i);
          return s?.pageType === "photo";
        }),
      );
      await project.addPage({
        insertAfterIndex: insertAfter,
        sourcePageIndex:
          photoSourceIndex >= 0
            ? project.instances[photoSourceIndex].sourcePageNumber - 1
            : sourcePageIndex,
        titleOverride: "Фото-страница",
      });
    } else if (optionId === "free") {
      await project.addPage({
        insertAfterIndex: insertAfter,
        sourcePageIndex,
        titleOverride: "Свободная страница",
      });
    }

    router.replace({
      pathname: "/album-pages",
      params: { id: project.projectId, celebration, coverType, interiorType },
    } as unknown as Href);
  };

  if (project.isLoading) {
    return (
      <AppScreen style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll contentContainerStyle={[styles.container, shellStyle]}>
      <AppHeader
        title="Добавить страницу"
        onBack={() => navigateToAlbumPages(albumFlowParams)}
      />

      {OPTIONS.map((option) => (
        <Pressable
          key={option.id}
          onPress={() => handleOption(option.id)}
          style={({ pressed }) => [styles.option, pressed && styles.pressed]}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={option.icon} size={24} color={colors.primary} />
          </View>
          <View style={styles.optionText}>
            <AppText variant="body">{option.title}</AppText>
            <AppText variant="caption" style={styles.description}>
              {option.description}
            </AppText>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.tabInactive}
          />
        </Pressable>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...createShadow("md"),
  },
  pressed: {
    opacity: 0.9,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySurface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  optionText: {
    flex: 1,
    gap: 4,
  },
  description: {
    color: colors.textSecondary,
  },
});
