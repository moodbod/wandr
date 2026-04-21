import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { designSystem } from '@/constants/design-system';
import type { ExploreActivityCard as ExploreActivityCardContent } from '@/constants/explore-content';
import { useColorScheme } from '@/hooks/use-color-scheme';

const CARD_RADIUS = 32;
const CARD_PADDING = 12;
const INNER_RADIUS = CARD_RADIUS - CARD_PADDING;

type ExploreActivityCardProps = {
  card: ExploreActivityCardContent;
  href?: Href;
};

export function ExploreActivityCard({ card, href }: ExploreActivityCardProps) {
  const isDark = useColorScheme() === 'dark';
  const router = useRouter();
  const shouldShowExploreButton = Boolean(href && card.ctaLabel.trim());
  const shouldMakeCardClickable = Boolean(href && !shouldShowExploreButton);

  const handlePress = () => {
    if (href) {
      router.push(href);
    }
  };

  const content = (
    <>
      <View style={styles.imageWrap}>
        <Image source={card.imageUri} contentFit="cover" style={styles.image} />
      </View>

      <View style={styles.body}>
        <View style={styles.metaRow}>
          <View
            style={[
              styles.badge,
              card.badgeTone === 'soft' ? styles.badgeSoft : styles.badgeAccent,
              isDark ? styles.badgeDark : null,
            ]}>
            <ThemedText
              style={[
                styles.badgeText,
                card.badgeTone === 'soft' ? styles.badgeSoftText : undefined,
                isDark ? styles.badgeTextDark : null,
              ]}>
                {card.badge}
              </ThemedText>
          </View>
        </View>

        <View style={styles.copy}>
          <ThemedText style={styles.title}>{card.title}</ThemedText>
          <ThemedText
            style={styles.subtitle}
            lightColor={designSystem.colors.warmDark}
            darkColor={designSystem.colors.darkMutedText}>
            {card.subtitle}
          </ThemedText>
        </View>

        <View style={styles.priceBlock}>
          <ThemedText style={styles.price} lightColor={designSystem.colors.ink} darkColor={designSystem.colors.darkText}>
            {card.price}
          </ThemedText>
          <ThemedText
            style={styles.priceSuffix}
            lightColor={designSystem.colors.gray}
            darkColor={designSystem.colors.darkMutedText}>
            {card.priceSuffix}
          </ThemedText>
        </View>

        {shouldShowExploreButton ? (
          <Pressable accessibilityRole="button" accessibilityLabel={card.ctaLabel} onPress={handlePress} style={styles.ctaButton}>
            <ThemedText
              style={styles.ctaLabel}
              lightColor={designSystem.colors.darkGreen}
              darkColor={designSystem.colors.darkGreen}>
              {card.ctaLabel}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </>
  );

  const shellStyle = [
    styles.shell,
    { borderColor: isDark ? designSystem.colors.darkBorder : designSystem.colors.border },
  ];

  if (shouldMakeCardClickable) {
    return (
      <Pressable accessibilityRole="button" onPress={handlePress}>
        <ThemedView lightColor="#ffffff" darkColor={designSystem.colors.darkSurface} style={shellStyle}>
          {content}
        </ThemedView>
      </Pressable>
    );
  }

  return (
    <ThemedView lightColor="#ffffff" darkColor={designSystem.colors.darkSurface} style={shellStyle}>
      {content}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
    padding: CARD_PADDING,
    gap: 14,
  },
  imageWrap: {
    height: 240,
    borderRadius: INNER_RADIUS,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  body: {
    paddingHorizontal: 6,
    paddingBottom: 8,
    gap: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  copy: {
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: designSystem.radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeAccent: {
    backgroundColor: designSystem.colors.mint,
  },
  badgeSoft: {
    backgroundColor: designSystem.colors.surface,
  },
  badgeDark: {
    backgroundColor: 'rgba(159, 232, 112, 0.12)',
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: designSystem.colors.darkGreen,
  },
  badgeSoftText: {
    color: designSystem.colors.warmDark,
  },
  badgeTextDark: {
    color: designSystem.colors.lime,
  },
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  price: {
    fontSize: 34,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  priceSuffix: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  ctaButton: {
    width: '100%',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.lime,
    borderWidth: 1,
    borderColor: 'rgba(14,15,12,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: -0.1,
    textTransform: 'uppercase',
  },
});
