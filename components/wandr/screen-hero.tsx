import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { designSystem } from '@/constants/design-system';

type WandrScreenHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function WandrScreenHero({ eyebrow, title, description }: WandrScreenHeroProps) {
  return (
    <ThemedView
      lightColor={designSystem.colors.surfaceMuted}
      darkColor={designSystem.colors.darkSurface}
      style={styles.hero}>
      <ThemedText style={styles.eyebrow}>{eyebrow}</ThemedText>
      <View style={styles.copy}>
        <ThemedText type="title" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText style={styles.description}>{description}</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: designSystem.spacing.xl,
    borderRadius: designSystem.radii.hero,
    gap: 10,
  },
  eyebrow: {
    ...designSystem.type.eyebrow,
    color: '#47672d',
  },
  copy: {
    gap: 10,
  },
  title: designSystem.type.title,
  description: designSystem.type.body,
});
