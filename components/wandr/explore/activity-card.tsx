import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { designSystem } from '@/constants/design-system';
import type { ExploreActivityCard as ExploreActivityCardContent } from '@/constants/explore-content';

type ExploreActivityCardProps = {
  card: ExploreActivityCardContent;
};

export function ExploreActivityCard({ card }: ExploreActivityCardProps) {
  return (
    <ThemedView lightColor="#ffffff" darkColor={designSystem.colors.darkSurface} style={styles.shell}>
      <View style={styles.imageWrap}>
        <Image source={card.imageUri} contentFit="cover" style={styles.image} />
        <View style={[styles.badge, card.badgeTone === 'soft' ? styles.badgeSoft : styles.badgeAccent]}>
          <ThemedText style={[styles.badgeText, card.badgeTone === 'soft' ? styles.badgeSoftText : undefined]}>
            {card.badge}
          </ThemedText>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.summaryRow}>
          <View style={styles.copy}>
            <ThemedText style={styles.title}>{card.title}</ThemedText>
            <ThemedText style={styles.subtitle}>{card.subtitle}</ThemedText>
          </View>
          <View style={styles.priceWrap}>
            <ThemedText style={styles.price}>{card.price}</ThemedText>
            <ThemedText style={styles.priceSuffix}>{card.priceSuffix}</ThemedText>
          </View>
        </View>

        <Pressable style={styles.cta}>
          <ThemedText style={styles.ctaLabel}>{card.ctaLabel}</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: designSystem.radii.section,
    padding: 16,
    gap: 16,
    shadowColor: '#0e0f0c',
    shadowOpacity: 0.04,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  imageWrap: {
    height: 256,
    borderRadius: designSystem.radii.feature,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 16,
    left: 16,
    borderRadius: designSystem.radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  badgeAccent: {
    backgroundColor: designSystem.colors.lime,
  },
  badgeSoft: {
    backgroundColor: '#c5eba3',
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: designSystem.colors.darkGreen,
  },
  badgeSoftText: {
    color: '#4b6c31',
  },
  body: {
    gap: 16,
    paddingHorizontal: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  priceWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  price: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '900',
    color: designSystem.colors.darkGreen,
  },
  priceSuffix: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: designSystem.colors.gray,
  },
  cta: {
    borderRadius: designSystem.radii.pill,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: designSystem.colors.lime,
  },
  ctaLabel: {
    fontSize: 13,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: designSystem.colors.darkGreen,
  },
});
