import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | 'default'
    | 'bodySmall'
    | 'caption'
    | 'label'
    | 'title'
    | 'pageTitle'
    | 'display'
    | 'defaultSemiBold'
    | 'subtitle'
    | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const flattenedStyle = StyleSheet.flatten(style);
  const styleColor = flattenedStyle?.color;
  const resolvedStyleColor =
    typeof styleColor === 'string' ? resolveThemeTextColor(styleColor, isDark) : undefined;
  const resolvedColor = resolvedStyleColor ?? color;
  const resolvedTypography = resolveThemeTextTypography(flattenedStyle, type);

  return (
    <Text
      style={[
        type === 'default' ? styles.default : undefined,
        type === 'bodySmall' ? styles.bodySmall : undefined,
        type === 'caption' ? styles.caption : undefined,
        type === 'label' ? styles.label : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'pageTitle' ? styles.pageTitle : undefined,
        type === 'display' ? styles.display : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
        resolvedTypography,
        { color: resolvedColor },
      ]}
      {...rest}
    />
  );
}

function resolveThemeTextTypography(
  style: TextStyle | undefined,
  type: NonNullable<ThemedTextProps['type']>
) {
  if (!style?.fontSize) {
    return undefined;
  }

  const fontSize = Number(style.fontSize);
  const letterSpacing = Number(style.letterSpacing ?? 0);
  const isUppercase = style.textTransform === 'uppercase';
  const isStrong = style.fontWeight === '600' || style.fontWeight === '700';

  if ((isUppercase && fontSize <= 14) || (fontSize <= 13 && letterSpacing >= 0.5)) {
    return designSystem.type.eyebrow;
  }

  if (type === 'link') {
    return undefined;
  }

  if (fontSize >= 38) {
    return designSystem.type.display;
  }

  if (fontSize >= 30) {
    return designSystem.type.pageTitle;
  }

  if (fontSize >= 22) {
    return designSystem.type.title;
  }

  if (fontSize >= 18) {
    return designSystem.type.subtitle;
  }

  if (fontSize >= 15) {
    return isStrong ? designSystem.type.bodyStrong : designSystem.type.body;
  }

  if (fontSize >= 13) {
    return isStrong ? designSystem.type.bodySmallStrong : designSystem.type.bodySmall;
  }

  return isStrong ? designSystem.type.label : designSystem.type.caption;
}

function resolveThemeTextColor(color: string, isDark: boolean) {
  if (isPrimaryTextColor(color)) {
    return isDark ? designSystem.semantic.dark.text : designSystem.semantic.light.text;
  }

  if (isMutedTextColor(color)) {
    return isDark ? designSystem.semantic.dark.textMuted : designSystem.semantic.light.textMuted;
  }

  if (isSubtleTextColor(color)) {
    return isDark ? designSystem.semantic.dark.textSubtle : designSystem.semantic.light.textSubtle;
  }

  if (color === designSystem.colors.darkText) {
    return designSystem.semantic.dark.text;
  }

  if (color === designSystem.colors.darkMutedText) {
    return designSystem.semantic.dark.textMuted;
  }

  return color;
}

function isPrimaryTextColor(color: string) {
  return (
    color === designSystem.colors.ink ||
    color === designSystem.colors.lightText ||
    color === designSystem.colors.lightTextStrong ||
    color === designSystem.colors.lightTextDeep
  );
}

function isMutedTextColor(color: string) {
  return (
    color === designSystem.colors.warmDark ||
    color === designSystem.colors.gray ||
    color === designSystem.colors.mutedText ||
    color === designSystem.colors.lightMutedWarm
  );
}

function isSubtleTextColor(color: string) {
  return (
    color === designSystem.colors.subtleText ||
    color === designSystem.colors.placeholderText ||
    color === designSystem.colors.placeholderTextSoft ||
    color === designSystem.colors.placeholderTextFaint
  );
}

const styles = StyleSheet.create({
  default: designSystem.type.body,
  bodySmall: designSystem.type.bodySmall,
  caption: designSystem.type.caption,
  label: designSystem.type.label,
  defaultSemiBold: designSystem.type.bodyStrong,
  display: designSystem.type.display,
  pageTitle: designSystem.type.pageTitle,
  title: designSystem.type.title,
  subtitle: designSystem.type.subtitle,
  link: {
    lineHeight: 24,
    fontSize: 16,
    color: designSystem.colors.darkGreen,
    fontWeight: '500',
  },
});
