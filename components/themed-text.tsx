import { StyleSheet, Text, type TextProps } from 'react-native';

import { designSystem } from '@/constants/design-system';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: designSystem.type.body,
  defaultSemiBold: designSystem.type.bodyStrong,
  title: designSystem.type.title,
  subtitle: designSystem.type.subtitle,
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: designSystem.colors.darkGreen,
    fontWeight: '600',
  },
});
