import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { designSystem } from '@/constants/design-system';
import type { ExploreActivityCard as ExploreActivityCardContent } from '@/constants/explore-content';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ExploreActivityCardProps = {
  card: ExploreActivityCardContent;
};

export function ExploreActivityCard({ card }: ExploreActivityCardProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <ThemedView 
      lightColor="#ffffff" 
      darkColor={designSystem.colors.darkSurface} 
      style={[
        styles.shell,
        { borderColor: isDark ? designSystem.colors.darkBorder : designSystem.colors.border }
      ]}
    >
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
            <ThemedText style={styles.subtitle} lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText}>{card.subtitle}</ThemedText>
          </View>
          <View style={styles.priceWrap}>
            <ThemedText style={styles.price} lightColor={designSystem.colors.darkGreen} darkColor={designSystem.colors.lime}>{card.price}</ThemedText>
            <ThemedText style={styles.priceSuffix} lightColor={designSystem.colors.gray} darkColor={designSystem.colors.gray}>{card.priceSuffix}</ThemedText>
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
    borderRadius: 32,
    borderWidth: 1,
    padding: 16,
  },
  imageWrap: {
    height: 256,
    borderRadius: 20,
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
    gap: 20,
    paddingTop: 20,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  priceWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  price: {
    fontSize: 34,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  priceSuffix: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cta: {
    borderRadius: designSystem.radii.pill,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: designSystem.colors.lime,
  },
  ctaLabel: {
    fontSize: 14,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: designSystem.colors.darkGreen,
  },
});
