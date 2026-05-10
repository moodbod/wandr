import { designSystem } from '@/constants/design-system';

export const AUTH_LAYOUT = {
  backButtonSize: 44,
  desktopMaxWidth: 560,
  primaryButtonHeight: designSystem.layout.inputHeight + designSystem.spacing.xs / 2,
} as const;

export function createAuthPalette(isDark: boolean) {
  return {
    background: isDark ? designSystem.semantic.dark.background : designSystem.semantic.light.background,
    surface: isDark ? designSystem.semantic.dark.surfaceRaised : designSystem.colors.white,
    text: isDark ? designSystem.semantic.dark.text : designSystem.semantic.light.text,
    textMuted: isDark ? designSystem.semantic.dark.textMuted : designSystem.semantic.light.textMuted,
    border: isDark ? designSystem.semantic.dark.borderSoft : designSystem.semantic.light.border,
    primary: designSystem.colors.lime,
    primaryText: designSystem.colors.darkGreen,
    error: designSystem.colors.liked,
  };
}

export type AuthPalette = ReturnType<typeof createAuthPalette>;
