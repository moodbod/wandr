import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import { Diamond } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TravelerMomentum } from '@/components/wandr/explore/traveler-momentum';
import { designSystem } from '@/constants/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import type { ExploreActivityCard as ExploreActivityCardContent } from '@/constants/explore-content';

const CARD_RADIUS = 28;
const FALLBACK_ACTIVITY_IMAGE = 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1200&q=80&fit=crop';

export type ExploreActivityCardProps = {
  card: ExploreActivityCardContent;
  marker?: 'gem';
  href?: Href;
  onPress?: () => void;
};

export function ExploreActivityCard({ card, marker, href, onPress }: ExploreActivityCardProps) {
  const router = useRouter();
  const { isLargeScreen } = useResponsive();
  const [imageFailed, setImageFailed] = useState(false);
  const hasPlaceholderImage = !card.imageUri || card.imageUri.includes('example.com');
  const imageUri = imageFailed || hasPlaceholderImage ? FALLBACK_ACTIVITY_IMAGE : card.imageUri;

  useEffect(() => {
    setImageFailed(false);
  }, [card.imageUri]);

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
          source={imageUri}
          contentFit="cover"
          onError={() => setImageFailed(true)}
          style={styles.image}
        />
        {marker === 'gem' ? (
          <View style={styles.gemMarker}>
            <Diamond color={designSystem.colors.white} size={18} weight="fill" />
          </View>
        ) : null}
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
  gemMarker: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.darkGreen,
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
