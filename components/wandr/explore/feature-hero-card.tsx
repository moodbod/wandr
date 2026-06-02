import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import { StyleSheet, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import type { ExploreFeatureHero } from '@/constants/explore-content';

type ExploreFeatureHeroCardProps = {
  card: ExploreFeatureHero;
  href?: Href;
};

export function ExploreFeatureHeroCard({ card, href }: ExploreFeatureHeroCardProps) {
  const router = useRouter();

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
        {href ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(href)}
            style={styles.cta}>
            <ThemedText style={styles.ctaLabel}>{card.ctaLabel}</ThemedText>
          </Pressable>
        ) : null}
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
    ...({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }),
  },
  overlay: {
    ...({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }),
    backgroundColor: designSystem.colors.blackOverlay,
  },
  content: {
    padding: 28,
    gap: 10,
    backgroundColor: designSystem.colors.darkScrim,
  },
  cta: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: designSystem.radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: designSystem.colors.lime,
  },
  ctaLabel: {
    fontSize: 13,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
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
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '600',
    color: designSystem.colors.white,
  },
  description: {
    maxWidth: 320,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: designSystem.colors.darkTextMedium,
  },
});
