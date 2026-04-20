import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import { StyleSheet, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { designSystem } from '@/constants/design-system';
import type { ExploreFeatureDetail } from '@/constants/explore-content';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ExploreFeatureDetailCardProps = {
  card: ExploreFeatureDetail;
  href?: Href;
};

export function ExploreFeatureDetailCard({ card, href }: ExploreFeatureDetailCardProps) {
  const isDark = useColorScheme() === 'dark';
  const router = useRouter();

  return (
    <ThemedView 
      lightColor="#ffffff" 
      darkColor={designSystem.colors.darkSurface} 
      style={[
        styles.shell, 
        { borderColor: isDark ? designSystem.colors.darkBorder : designSystem.colors.border }
      ]}
    >
      <Image source={card.imageUri} contentFit="cover" style={styles.image} />
      <View style={styles.content}>
        <ThemedText style={styles.category}>{card.category}</ThemedText>
        <ThemedText style={styles.title}>{card.title}</ThemedText>
        <ThemedText style={styles.description}>{card.description}</ThemedText>
        <View style={styles.footer}>
          <View style={styles.priceRow}>
            <ThemedText style={styles.price}>{card.price}</ThemedText>
            <ThemedText style={styles.priceSuffix}>{card.priceSuffix}</ThemedText>
          </View>
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 420,
    borderRadius: 32,
    borderWidth: 1,
    padding: 16,
  },
  image: {
    height: 240,
    width: '100%',
    borderRadius: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 4,
    paddingTop: 20,
    paddingBottom: 4,
    gap: 12,
  },
  category: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: designSystem.colors.darkGreen,
  },
  title: {
    fontSize: 30,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -0.9,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: designSystem.colors.warmDark,
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  price: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '900',
  },
  priceSuffix: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: designSystem.colors.gray,
  },
  cta: {
    borderRadius: designSystem.radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: designSystem.colors.lime,
  },
  ctaLabel: {
    fontSize: 12,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: designSystem.colors.darkGreen,
  },
});
