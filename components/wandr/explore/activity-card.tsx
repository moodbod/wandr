import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TravelerMomentum } from '@/components/wandr/explore/traveler-momentum';
import { designSystem } from '@/constants/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import type { ExploreActivityCard as ExploreActivityCardContent } from '@/constants/explore-content';

const CARD_RADIUS = 28;

export type ExploreActivityCardProps = {
  card: ExploreActivityCardContent;
  href?: Href;
  onPress?: () => void;
};

export function ExploreActivityCard({ card, href, onPress }: ExploreActivityCardProps) {
  const router = useRouter();
  const { isLargeScreen } = useResponsive();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (href) {
      router.push(href);
    }
  };

  return (
    <Pressable
      accessibilityRole={(href || onPress) ? 'button' : undefined}
      onPress={(href || onPress) ? handlePress : undefined}
      style={[styles.pressable, isLargeScreen && styles.pressableLarge]}
    >
      <View style={[styles.imageWrap, isLargeScreen && styles.imageWrapLarge]}>
        <Image
          source={card.imageUri}
          contentFit="cover"
          style={styles.image}
        />
      </View>

      <View style={[styles.body, isLargeScreen && styles.bodyLarge]}>
        <View style={styles.copy}>
          <ThemedText style={[styles.title, isLargeScreen && styles.titleLarge]}>{card.title}</ThemedText>
          <ThemedText
            style={[styles.subtitle, isLargeScreen && styles.subtitleLarge]}
            lightColor={designSystem.colors.warmDark}
            darkColor={designSystem.colors.darkMutedText}>
            {card.subtitle}
          </ThemedText>
        </View>

        {typeof card.visitorCount === 'number' ? (
          <TravelerMomentum
            regionName={card.countryLabel ?? 'travelers'}
            visitorCount={card.visitorCount}
            avatarUris={card.avatarUris ?? []}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    gap: 14,
    marginBottom: 20,
  },
  pressableLarge: {
    gap: 10,
    marginBottom: 14,
  },
  imageWrap: {
    width: '100%',
    height: 280,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageWrapLarge: {
    aspectRatio: 1.34,
    height: undefined,
    borderRadius: 22,
  },
  body: {
    gap: 12,
    paddingHorizontal: 2,
  },
  bodyLarge: {
    gap: 8,
  },
  copy: {
    gap: 6,
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
  },
  titleLarge: {
    fontSize: 19,
    lineHeight: 23,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  subtitleLarge: {
    fontSize: 14,
    lineHeight: 20,
  },
});
