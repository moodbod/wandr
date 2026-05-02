import type { PressableProps } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useThemeColor } from '@/hooks/use-theme-color';

type WandrActionCardProps = PressableProps & {
  title: string;
  description: string;
};

export function WandrActionCard({ title, description, style, ...pressableProps }: WandrActionCardProps) {
  const backgroundColor = useThemeColor(
    { light: designSystem.colors.surface, dark: designSystem.colors.darkSurface },
    'card'
  );

  return (
    <Pressable
      style={(state) => [
        styles.card,
        { backgroundColor },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...pressableProps}>
      <ThemedText type="defaultSemiBold" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText style={styles.description}>{description}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: designSystem.radii.panel,
    padding: designSystem.layout.cardPadding,
  },
  title: {
    ...designSystem.type.cardTitle,
    marginBottom: 4,
  },
  description: designSystem.type.cardBody,
});
