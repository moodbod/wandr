import {
  background,
  buttonStyle,
  foregroundStyle,
  listRowBackground,
  listStyle,
  scrollContentBackground,
  tint,
} from '@expo/ui/swift-ui/modifiers';

import { designSystem } from '@/constants/design-system';

export function getNativeSettingsPalette(colorScheme: string | null | undefined) {
  const isDark = colorScheme === 'dark';

  return {
    accent: isDark ? designSystem.colors.lime : designSystem.colors.darkGreen,
    background: isDark ? designSystem.colors.darkBackground : designSystem.colors.background,
    chevron: isDark ? designSystem.colors.darkSubtleText : designSystem.colors.subtleText,
    colorScheme: isDark ? ('dark' as const) : ('light' as const),
    icon: isDark ? designSystem.colors.lime : designSystem.colors.fern,
    row: isDark ? designSystem.colors.darkSurface : designSystem.colors.surfaceRaised,
  };
}

export type NativeSettingsPalette = ReturnType<typeof getNativeSettingsPalette>;

export const nativePrimaryText = foregroundStyle({ type: 'hierarchical', style: 'primary' });
export const nativeSecondaryText = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

export function nativeFormModifiers(palette: NativeSettingsPalette) {
  return [listStyle('insetGrouped'), scrollContentBackground('hidden'), background(palette.background)];
}

export function nativeSectionModifiers(palette: NativeSettingsPalette) {
  return [listRowBackground(palette.row)];
}

export function nativeNavigationRowModifiers() {
  return [buttonStyle('plain'), nativePrimaryText];
}

export function nativeActionButtonModifiers(palette: NativeSettingsPalette) {
  return [buttonStyle('plain'), tint(palette.accent)];
}

export function nativeControlModifiers(palette: NativeSettingsPalette) {
  return [tint(palette.accent)];
}
