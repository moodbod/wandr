import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TravelerMomentum } from '@/components/wandr/explore/traveler-momentum';
import { designSystem } from '@/constants/design-system';
import type { ExploreActivityCard as ExploreActivityCardContent } from '@/constants/explore-content';

const CARD_RADIUS = 28;

type ExploreActivityCardProps = {
  card: ExploreActivityCardContent;
  href?: Href;
};

export function ExploreActivityCard({ card, href }: ExploreActivityCardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (href) {
      router.push(href);
    }
  };

  return (
    <Pressable accessibilityRole={href ? 'button' : undefined} onPress={href ? handlePress : undefined} style={styles.pressable}>
      <View style={styles.imageWrap}>
        <Image source={card.imageUri} contentFit="cover" style={styles.image} />
      </View>

      <View style={styles.body}>
        <View style={styles.copy}>
          <ThemedText style={styles.title}>{card.title}</ThemedText>
          <ThemedText
            style={styles.subtitle}
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
  body: {
    gap: 12,
    paddingHorizontal: 2,
  },
  copy: {
    gap: 6,
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
});
