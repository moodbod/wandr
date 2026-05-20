import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import { Diamond } from 'phosphor-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { createAuthPalette } from '@/components/wandr/auth/auth-palette';
import { TravelerMomentum } from '@/components/wandr/explore/traveler-momentum';
import { designSystem } from '@/constants/design-system';
import type { ExploreActivityCard as ExploreActivityCardContent } from '@/constants/explore-content';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';

export type ExploreActivityCardProps = {
  card: ExploreActivityCardContent;
  marker?: 'gem';
  href?: Href;
  onPress?: () => void;
};

export function ExploreActivityCard({ card, marker, href, onPress }: ExploreActivityCardProps) {
  const router = useRouter();
  const { isLargeScreen } = useResponsive();
  const isDark = useColorScheme() === 'dark';
  const palette = useMemo(() => createAuthPalette(isDark), [isDark]);
  const [imageFailed, setImageFailed] = useState(false);
  const shouldShowImage = Boolean(card.imageUri) && !imageFailed;
  const titleColor = isLargeScreen ? designSystem.colors.darkTextWarm : palette.text;
  const subtitleColor = isLargeScreen
    ? 'rgba(243,244,239,0.68)'
    : isDark
      ? designSystem.colors.darkMutedText
      : designSystem.colors.warmDark;

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
      style={[
        styles.pressable,
        isLargeScreen && styles.pressableLarge,
      ]}
    >
      <View style={[styles.imageWrap, isLargeScreen && styles.imageWrapLarge]}>
        {shouldShowImage ? (
          <Image
            source={card.imageUri}
            contentFit="cover"
            onError={() => setImageFailed(true)}
            style={styles.image}
          />
        ) : null}
        {marker === 'gem' ? (
          <View style={styles.gemMarker}>
            <Diamond color={designSystem.colors.white} size={18} weight="fill" />
          </View>
        ) : null}
      </View>

      <View style={[styles.body, isLargeScreen && styles.bodyLarge]}>
        <View style={styles.copy}>
          <ThemedText
            style={[styles.title, isLargeScreen && styles.titleLarge]}
            lightColor={titleColor}
            darkColor={titleColor}>
            {card.title}
          </ThemedText>
          <ThemedText
            style={[styles.subtitle, isLargeScreen && styles.subtitleLarge]}
            lightColor={subtitleColor}
            darkColor={subtitleColor}>
            {card.subtitle}
          </ThemedText>
        </View>

        {typeof card.visitorCount === 'number' ? (
          <TravelerMomentum
            regionName={card.countryLabel ?? 'travelers'}
            visitorCount={card.visitorCount}
            avatarUris={card.avatarUris ?? []}
            tone={isLargeScreen ? 'darkPanel' : 'default'}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginBottom: 20,
  },
  pressableLarge: {
    marginBottom: 30,
  },
  imageWrap: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageWrapLarge: {
    aspectRatio: 1.5,
    height: undefined,
    borderRadius: 9,
  },
  gemMarker: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.darkGreen,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  body: {
    gap: 10,
    paddingTop: 12,
    paddingBottom: 4,
  },
  bodyLarge: {
    gap: 7,
    paddingTop: 12,
    paddingBottom: 0,
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
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  subtitleLarge: {
    fontSize: 13,
    lineHeight: 18,
  },
});
