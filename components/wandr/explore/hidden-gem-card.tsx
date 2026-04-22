import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { designSystem } from '@/constants/design-system';
import type { ExploreHiddenGem } from '@/constants/explore-content';
import { useColorScheme } from '@/hooks/use-color-scheme';

const CARD_RADIUS = 32;
const CARD_PADDING = 12;
const INNER_RADIUS = CARD_RADIUS - CARD_PADDING;

type ExploreHiddenGemCardProps = {
  card: ExploreHiddenGem;
  href?: Href;
};

export function ExploreHiddenGemCard({ card, href }: ExploreHiddenGemCardProps) {
  const isDark = useColorScheme() === 'dark';
  const router = useRouter();

  const content = (
    <>
      <Image source={card.imageUri} contentFit="cover" style={styles.image} />
      <View style={styles.copy}>
        <ThemedText style={styles.title}>{card.title}</ThemedText>
        <ThemedText style={styles.description}>{card.description}</ThemedText>
      </View>
    </>
  );

  return (
    <ThemedView
      lightColor="#ffffff"
      darkColor={designSystem.colors.darkSurface}
      style={[
        styles.shell,
        { borderColor: isDark ? designSystem.colors.darkBorder : designSystem.colors.border }
      ]}
    >
      {href ? (
        <Pressable accessibilityRole="button" onPress={() => router.push(href)} style={styles.pressable}>
          {content}
        </Pressable>
      ) : (
        content
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
    padding: CARD_PADDING,
  },
  pressable: {
    gap: 0,
  },
  image: {
    width: '100%',
    height: 280,
    borderRadius: INNER_RADIUS,
  },
  copy: {
    paddingTop: 16,
    paddingBottom: 6,
    gap: 8,
  },
  title: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: designSystem.colors.warmDark,
  },
});
