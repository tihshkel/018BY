import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

import { spacing } from "@/constants/design-tokens";
import {
  FORM_MODAL_MAX_WIDTH,
  getEditorPageDisplayScale,
  getEditorPageViewportWidth,
  getTabletContentShell,
  getTabletSectionWrap,
  isTabletLayout,
  PICKER_CONTENT_MAX_WIDTH,
  useResponsiveLayout,
} from "@/utils/responsive";

const PREVIEW_CHROME_HEIGHT = 320;
const PREVIEW_CHROME_HEIGHT_SPLIT = 120;

function getAlbumShellStyle(layout: ReturnType<typeof useResponsiveLayout>) {
  return getTabletContentShell(layout) ?? getTabletSectionWrap(layout, spacing.md);
}

export function useAlbumFormLayout() {
  const layout = useResponsiveLayout(FORM_MODAL_MAX_WIDTH);

  return { layout, shellStyle: getAlbumShellStyle(layout) };
}

export function useAlbumPageListLayout() {
  const layout = useResponsiveLayout(PICKER_CONTENT_MAX_WIDTH);

  return { layout, shellStyle: getAlbumShellStyle(layout) };
}

export function useAlbumPagePreviewLayout(imageAspectRatio?: number) {
  const { width, height } = useWindowDimensions();
  const listLayout = useResponsiveLayout(PICKER_CONTENT_MAX_WIDTH);
  const shellStyle = getAlbumShellStyle(listLayout);

  return useMemo(() => {
    const isTablet = isTabletLayout(width);
    const isLandscape = width > height;
    const useSplitLayout = isTablet && isLandscape;
    const phoneCoordinateWidth = Math.max(width - spacing.md * 2, 280);
    const coordinateWidth = isTablet
      ? getEditorPageViewportWidth(width)
      : phoneCoordinateWidth;

    const chromeHeight = useSplitLayout
      ? PREVIEW_CHROME_HEIGHT_SPLIT
      : PREVIEW_CHROME_HEIGHT;

    const displayScale = isTablet
      ? getEditorPageDisplayScale(
          width,
          height,
          coordinateWidth,
          chromeHeight,
        )
      : 1;

    const aspect =
      imageAspectRatio && imageAspectRatio > 0 ? imageAspectRatio : 1.414;
    const coordinateHeight = coordinateWidth * aspect;
    const displayWidth = coordinateWidth * displayScale;
    const displayHeight = coordinateHeight * displayScale;

    return {
      isTablet,
      isLandscape,
      useSplitLayout,
      coordinateWidth,
      coordinateHeight,
      displayScale,
      displayWidth,
      displayHeight,
      shellStyle,
    };
  }, [width, height, imageAspectRatio, shellStyle]);
}
