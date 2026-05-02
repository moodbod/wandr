/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';
import { designSystem } from '@/constants/design-system';

const tintColorLight = designSystem.colors.darkGreen;
const tintColorDark = designSystem.colors.lime;
const lightTheme = designSystem.semantic.light;
const darkTheme = designSystem.semantic.dark;

export const Colors = {
  light: {
    text: lightTheme.text,
    background: lightTheme.background,
    tint: tintColorLight,
    icon: lightTheme.textMuted,
    tabIconDefault: lightTheme.textMuted,
    tabIconSelected: tintColorLight,
    card: lightTheme.surface,
    border: lightTheme.borderSoft,
  },
  dark: {
    text: darkTheme.text,
    background: darkTheme.background,
    tint: tintColorDark,
    icon: darkTheme.textMuted,
    tabIconDefault: darkTheme.textMuted,
    tabIconSelected: tintColorDark,
    card: darkTheme.surface,
    border: darkTheme.border,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
