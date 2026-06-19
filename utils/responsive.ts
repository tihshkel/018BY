import { Platform, useWindowDimensions } from "react-native";

/** Minimum width (dp) to treat as tablet layout on Android and in landscape phones. */
export const TABLET_BREAKPOINT = 768;

/** Reference page canvas width (iPhone) — used on tablets so annotation coords match phone + export. */
export const EDITOR_PAGE_VIEWPORT_WIDTH = 390;

/** Max visual upscale on tablet (display only; coordinate space stays EDITOR_PAGE_VIEWPORT_WIDTH). */
export const EDITOR_PAGE_DISPLAY_MAX_SCALE = 1.65;

export const AUTH_CONTENT_MAX_WIDTH = 400;
export const ONBOARDING_CONTENT_MAX_WIDTH = 520;
/** @deprecated Use HOME_CONTENT_MAX_WIDTH — единая ширина главного экрана. */
export const HOME_ACTION_MAX_WIDTH = 520;
/** @deprecated Use HOME_CONTENT_MAX_WIDTH */
export const HOME_PROJECTS_MAX_WIDTH = 720;
/** Единая ширина контента на главном экране (планшет). */
export const HOME_CONTENT_MAX_WIDTH = 840;
/** Списки выбора: обложки, категории проектов. */
export const PICKER_CONTENT_MAX_WIDTH = 840;
/** Максимальная ширина области каталога товаров на планшете. */
export const CATALOG_MAX_WIDTH = 960;
/** Максимальная ширина форм и bottom-sheet на планшете. */
export const FORM_MODAL_MAX_WIDTH = 520;

export const WIDE_TABLET_BREAKPOINT = 1000;

export interface GridColumnOptions {
  wideBreakpoint?: number;
  tabletColumns?: number;
  wideColumns?: number;
}

export function getGridColumnCount(
  layout: ResponsiveLayout,
  options: GridColumnOptions = {},
): number {
  const {
    wideBreakpoint = WIDE_TABLET_BREAKPOINT,
    tabletColumns = 2,
    wideColumns = 3,
  } = options;
  if (!layout.isTablet) {
    return 1;
  }
  return layout.width >= wideBreakpoint ? wideColumns : tabletColumns;
}

export function getGridItemWidth(
  layout: ResponsiveLayout,
  columnCount: number,
  gap = 16,
): number {
  if (columnCount <= 1) {
    return layout.isTablet ? layout.contentMaxWidth : layout.width * 0.75;
  }
  return (layout.contentMaxWidth - (columnCount - 1) * gap) / columnCount;
}

export function getTabletContentShell(layout: ResponsiveLayout):
  | {
      width: "100%";
      maxWidth: number;
      alignSelf: "center";
      paddingHorizontal: number;
    }
  | undefined {
  if (!layout.isTablet) {
    return undefined;
  }
  return {
    width: "100%",
    maxWidth: layout.contentMaxWidth + layout.horizontalPadding * 2,
    alignSelf: "center",
    paddingHorizontal: layout.horizontalPadding,
  };
}

export interface TabletSectionWrapOptions {
  phonePadding?: number;
  /** 0 when parent uses getTabletContentShell (avoids double side padding). */
  tabletPadding?: number;
}

export function getTabletSectionWrap(
  layout: ResponsiveLayout,
  options: TabletSectionWrapOptions | number = {},
): {
  paddingHorizontal: number;
  alignSelf?: "center";
  width?: "100%";
  maxWidth?: number;
} {
  const opts: TabletSectionWrapOptions =
    typeof options === "number"
      ? { phonePadding: options, tabletPadding: 0 }
      : options;
  const phonePadding = opts.phonePadding ?? 24;
  const tabletPadding = opts.tabletPadding ?? layout.horizontalPadding;

  return {
    paddingHorizontal: layout.isTablet ? tabletPadding : phonePadding,
    ...(layout.isTablet && {
      alignSelf: "center" as const,
      width: "100%" as const,
      maxWidth: layout.contentMaxWidth,
    }),
  };
}

/** FlatList grid inside a scroll parent — full content width, no overflow. */
export function getGridListStyle(layout: ResponsiveLayout): {
  width: number;
  alignSelf: "center";
} {
  return {
    width: layout.contentMaxWidth,
    alignSelf: "center",
  };
}

export function getGridColumnWrapperStyle(gap = 16): {
  gap: number;
  marginBottom: number;
} {
  return { gap, marginBottom: gap };
}

export function getTabletBottomModalStyles(layout: ResponsiveLayout): {
  overlay: {
    justifyContent: "flex-end" | "center";
    alignItems?: "center";
    paddingHorizontal?: number;
  };
  content: {
    width?: "100%";
    maxWidth?: number;
    borderRadius?: number;
    maxHeight?: "85%";
  };
} {
  if (!layout.isTablet) {
    return {
      overlay: { justifyContent: "flex-end" },
      content: {},
    };
  }
  return {
    overlay: {
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: layout.horizontalPadding,
    },
    content: {
      width: "100%",
      maxWidth: layout.contentMaxWidth,
      borderRadius: 24,
      maxHeight: "85%",
    },
  };
}

const GUIDELINE_WIDTH = 375;
const GUIDELINE_HEIGHT = 812;

export interface ResponsiveLayout {
  width: number;
  height: number;
  fontScale: number;
  /** Wide tablet UI (grid, centered shell). False in Split View on iPad. */
  isTablet: boolean;
  /** iPad in narrow Split View — use phone-like layout. */
  isCompactTablet: boolean;
  /** Physical tablet device — editor/export coords stay at 390px. */
  isTabletDevice: boolean;
  isLandscape: boolean;
  isCompactHeight: boolean;
  contentMaxWidth: number;
  horizontalPadding: number;
  scale: (size: number) => number;
  verticalScale: (size: number) => number;
}

/** iPad hardware or Android tablet width — for editor coordinate space only. */
export function isTabletDevice(windowWidth?: number): boolean {
  if (Platform.OS === "ios" && Platform.isPad) {
    return true;
  }
  if (windowWidth != null && windowWidth >= TABLET_BREAKPOINT) {
    return true;
  }
  return false;
}

/** Wide layout shell (grids, max-width columns). Respects Split View width. */
export function isTabletLayout(width: number): boolean {
  return width >= TABLET_BREAKPOINT;
}

/** Viewport width passed to page editor / PdfAnnotations (phone = full width, tablet = fixed). */
export function getEditorPageViewportWidth(windowWidth: number): number {
  return isTabletDevice(windowWidth) ? EDITOR_PAGE_VIEWPORT_WIDTH : windowWidth;
}

/**
 * Visual-only scale for tablet editor: album looks larger on screen while coords stay at 390px width.
 */
export function getEditorPageDisplayScale(
  windowWidth: number,
  windowHeight: number,
  coordinateViewportWidth: number = EDITOR_PAGE_VIEWPORT_WIDTH,
  chromeHeight = 280,
): number {
  if (!isTabletDevice(windowWidth)) return 1;

  const horizontalInset = 48;
  const availableHeight = Math.max(
    windowHeight - chromeHeight,
    coordinateViewportWidth,
  );
  const availableWidth = Math.max(
    windowWidth - horizontalInset,
    coordinateViewportWidth,
  );

  const targetSize = Math.min(
    availableWidth * 0.72,
    availableHeight * 0.78,
    coordinateViewportWidth * EDITOR_PAGE_DISPLAY_MAX_SCALE,
  );

  const scale = targetSize / coordinateViewportWidth;
  return Math.min(Math.max(scale, 1), EDITOR_PAGE_DISPLAY_MAX_SCALE);
}

export function useResponsiveLayout(
  maxContentWidth: number = ONBOARDING_CONTENT_MAX_WIDTH,
): ResponsiveLayout {
  const { width, height, fontScale } = useWindowDimensions();
  const tabletDevice = isTabletDevice(width);
  const isTablet = isTabletLayout(width);
  const isCompactTablet = tabletDevice && !isTablet;
  const isLandscape = width > height;
  const isCompactHeight = height < 700;
  const horizontalPadding = isTablet ? (isLandscape ? 64 : 48) : 32;

  const phoneWidthScale = Math.min(
    Math.max(width / GUIDELINE_WIDTH, 0.85),
    1.12,
  );
  const phoneHeightScale = Math.min(
    Math.max(height / GUIDELINE_HEIGHT, 0.9),
    1.1,
  );

  const scale = (size: number): number =>
    isTablet ? size : Math.round(size * phoneWidthScale);

  const verticalScale = (size: number): number =>
    isTablet ? size : Math.round(size * phoneHeightScale);

  const contentMaxWidth = isTablet
    ? Math.min(maxContentWidth, width - horizontalPadding * 2)
    : width;

  return {
    width,
    height,
    fontScale,
    isTablet,
    isCompactTablet,
    isTabletDevice: tabletDevice,
    isLandscape,
    isCompactHeight,
    contentMaxWidth,
    horizontalPadding,
    scale,
    verticalScale,
  };
}
