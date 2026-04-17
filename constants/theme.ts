/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';
import { designSystem } from '@/constants/design-system';

const tintColorLight = '#5aa024ff';
const tintColorDark = designSystem.colors.lime;

export const Colors = {
  light: {
    text: designSystem.colors.ink,
    background: designSystem.colors.background,
    tint: tintColorLight,
    icon: '#6f7668',
    tabIconDefault: '#6f7668',
    tabIconSelected: tintColorLight,
    card: designSystem.colors.surface,
    border: '#dde3d4',
  },
  dark: {
    text: designSystem.colors.darkText,
    background: designSystem.colors.darkBackground,
    tint: tintColorDark,
    icon: designSystem.colors.darkMutedText,
    tabIconDefault: designSystem.colors.darkMutedText,
    tabIconSelected: tintColorDark,
    card: designSystem.colors.darkSurface,
    border: designSystem.colors.darkBorder,
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
