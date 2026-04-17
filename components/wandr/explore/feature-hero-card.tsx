import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import type { ExploreFeatureHero } from '@/constants/explore-content';

type ExploreFeatureHeroCardProps = {
  card: ExploreFeatureHero;
};

export function ExploreFeatureHeroCard({ card }: ExploreFeatureHeroCardProps) {
  return (
    <View style={styles.shell}>
      <Image source={card.imageUri} contentFit="cover" style={styles.image} />
      <View style={styles.overlay} />
      <View style={styles.content}>
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>{card.badge}</ThemedText>
        </View>
        <ThemedText style={styles.title}>{card.title}</ThemedText>
        <ThemedText style={styles.description}>{card.description}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 420,
    borderRadius: 32,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  content: {
    padding: 28,
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.24)',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: designSystem.colors.lime,
    borderRadius: designSystem.radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: designSystem.colors.darkGreen,
  },
  title: {
    fontSize: 40,
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: -1.2,
    textTransform: 'uppercase',
    color: '#ffffff',
  },
  description: {
    maxWidth: 320,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.84)',
  },
});
