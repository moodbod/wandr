import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import { StyleSheet, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { designSystem } from '@/constants/design-system';
import type { ExploreFeatureDetail } from '@/constants/explore-content';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUserSettings } from '@/hooks/use-current-user-settings';
import { formatUsdPriceParts } from '@/lib/currency';

const CARD_RADIUS = 32;
const CARD_PADDING = 12;
const INNER_RADIUS = CARD_RADIUS - CARD_PADDING;

type ExploreFeatureDetailCardProps = {
  card: ExploreFeatureDetail;
  href?: Href;
};

export function ExploreFeatureDetailCard({ card, href }: ExploreFeatureDetailCardProps) {
  const isDark = useColorScheme() === 'dark';
  const settings = useCurrentUserSettings();
  const router = useRouter();
  const price = formatUsdPriceParts(card.price, settings?.preferredCurrency ?? 'USD');

  return (
    <ThemedView 
      lightColor={designSystem.colors.white} 
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
          <View style={styles.priceStack}>
            <View style={styles.priceRow}>
              <ThemedText style={styles.price}>{price.amountLabel}</ThemedText>
              <ThemedText style={styles.priceSuffix}>{card.priceSuffix}</ThemedText>
            </View>
            {price.rateLabel ? <ThemedText style={styles.priceRate}>{price.rateLabel}</ThemedText> : null}
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
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    padding: CARD_PADDING,
  },
  image: {
    height: 240,
    width: '100%',
    borderRadius: INNER_RADIUS,
  },
  content: {
    flex: 1,
    paddingTop: 16,
    gap: 12,
  },
  category: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  title: {
    fontSize: 30,
    lineHeight: 30,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
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
  priceStack: {
    flex: 1,
    gap: 3,
  },
  price: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '600',
  },
  priceSuffix: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
  priceRate: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '400',
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
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
});
