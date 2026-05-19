import { designSystem } from '@/constants/design-system';

export const AUTH_LAYOUT = {
  backButtonSize: 44,
  desktopMaxWidth: 560,
  primaryButtonHeight: designSystem.layout.inputHeight + designSystem.spacing.xs / 2,
} as const;

export function createAuthPalette(isDark: boolean) {
  return {
    background: isDark ? designSystem.semantic.dark.background : designSystem.semantic.light.background,
    modalBackground: isDark ? 'rgba(20, 20, 20, 0.65)' : 'rgba(255, 255, 255, 0.85)',
    surface: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    surfaceRaised: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    inputBackground: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    text: isDark ? designSystem.semantic.dark.text : designSystem.semantic.light.text,
    textMuted: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    primary: designSystem.colors.lime,
    primaryText: designSystem.colors.darkGreen,
    error: designSystem.colors.liked,
  };
}

export type AuthPalette = ReturnType<typeof createAuthPalette>;
