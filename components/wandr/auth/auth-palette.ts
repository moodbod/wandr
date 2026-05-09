import { designSystem } from '@/constants/design-system';

export function createAuthPalette(isDark: boolean) {
  return {
    background: isDark ? designSystem.semantic.dark.background : designSystem.semantic.light.background,
    surface: isDark ? designSystem.semantic.dark.surfaceRaised : designSystem.colors.white,
    text: isDark ? designSystem.semantic.dark.text : designSystem.semantic.light.text,
    textMuted: isDark ? designSystem.semantic.dark.textMuted : designSystem.semantic.light.textMuted,
    border: isDark ? designSystem.semantic.dark.borderSoft : designSystem.semantic.light.border,
    borderStrong: isDark ? designSystem.colors.lime : designSystem.colors.darkGreen,
    placeholder: isDark ? designSystem.semantic.dark.placeholder : designSystem.semantic.light.placeholder,
    primary: designSystem.colors.lime,
    primaryText: designSystem.colors.darkGreen,
    error: designSystem.colors.liked,
  };
}

export type AuthPalette = ReturnType<typeof createAuthPalette>;

export const AUTH_LAYOUT = {
  backButtonSize: 44,
  checkIconSize: 112,
  desktopMaxWidth: 560,
  doneCheckRadius: 42,
  doneCheckRotation: '-10deg',
  doneCheckSize: 190,
  disabledOpacity: 0.45,
  formTitleFontSize: 31,
  iconSize: 24,
  iconSizeMd: 22,
  primaryButtonHeight: designSystem.layout.inputHeight + designSystem.spacing.xs / 2,
  travelStyleWidth: '47%',
} as const;
