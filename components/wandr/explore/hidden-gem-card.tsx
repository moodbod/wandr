import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { designSystem } from '@/constants/design-system';
import type { ExploreHiddenGem } from '@/constants/explore-content';

type ExploreHiddenGemCardProps = {
  card: ExploreHiddenGem;
};

export function ExploreHiddenGemCard({ card }: ExploreHiddenGemCardProps) {
  return (
    <ThemedView lightColor="#f4f4f1" darkColor={designSystem.colors.darkSurface} style={styles.shell}>
      <Image source={card.imageUri} contentFit="cover" style={styles.image} />
      <View style={styles.copy}>
        <ThemedText style={styles.title}>{card.title}</ThemedText>
        <ThemedText style={styles.description}>{card.description}</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 32,
    padding: 8,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 24,
    marginBottom: 20,
  },
  copy: {
    paddingHorizontal: 12,
    paddingBottom: 18,
    gap: 8,
  },
  title: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: designSystem.colors.warmDark,
  },
});
