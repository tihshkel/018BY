import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  background: '#FFFFFF',
  textPrimary: '#3D3D3D',
  textSecondary: '#8A8A8A',
  border: '#E5E5E5',
  primary: '#F194A2',
  genderBoy: '#89CFF0',
  genderGirl: '#F194A2',
  genderChild: '#F5C896',
  pregnancyFormFill: '#8B5A3C',
  primaryLight: '#F5A8B3',
  primaryPressed: '#D97F8D',
  primarySurface: '#FDF0F2',
  info: '#C62828',
  tabInactive: '#C4C4C4',
  white: '#FFFFFF',
  placeholder: '#B0B0B0',
  error: '#C62828',
  statusFilled: '#4CAF50',
  statusContinue: '#F5A623',
  statusDraft: '#9C7BD8',
  statusDraftCircle: '#E8C4A8',
  statusEmpty: '#B0B0B0',
  statusLocked: '#9E9E9E',
  statusExcluded: '#C62828',
  overlay: 'rgba(61, 61, 61, 0.45)',
  focusRing: '#F194A2',
  chipSelectedBg: '#FDF0F2',
} as const;

export const surfaces = {
  muted: '#FAFAFA',
  elevated: '#FFFFFF',
  sheet: '#FFFFFF',
} as const;

export const motion = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: {
    damping: 18,
    stiffness: 180,
    mass: 0.8,
  },
  pressScale: 0.97,
} as const;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

type FontWeight = TextStyle['fontWeight'];

export function sansFont(weight: 'regular' | 'medium' | 'semibold' | 'bold' = 'regular'): string {
  const map = {
    regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
    medium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
    semibold: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
    bold: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  } as const;
  return map[weight] ?? 'sans-serif';
}

export function fontWeightFor(weight: 'regular' | 'medium' | 'semibold' | 'bold'): FontWeight {
  const map: Record<typeof weight, FontWeight> = {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  };
  return map[weight];
}

export const typography = {
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as FontWeight,
    fontFamily: sansFont('bold'),
    color: colors.textPrimary,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700' as FontWeight,
    fontFamily: sansFont('bold'),
    color: colors.textPrimary,
  },
  titleSm: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as FontWeight,
    fontFamily: sansFont('semibold'),
    color: colors.textPrimary,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as FontWeight,
    fontFamily: sansFont('regular'),
    color: colors.textPrimary,
  },
  bodySm: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as FontWeight,
    fontFamily: sansFont('regular'),
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '300' as FontWeight,
    fontFamily: sansFont('regular'),
    color: colors.textSecondary,
  },
  stepLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as FontWeight,
    fontFamily: sansFont('semibold'),
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  button: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as FontWeight,
    fontFamily: sansFont('semibold'),
    color: colors.white,
  },
} as const;

export function createShadow(level: 'sm' | 'md' | 'lg'): ViewStyle {
  if (level === 'sm') {
    return {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    };
  }
  if (level === 'md') {
    return {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    };
  }
  return {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  };
}
