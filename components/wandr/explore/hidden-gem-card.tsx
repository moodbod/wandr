import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { designSystem } from '@/constants/design-system';
import type { ExploreHiddenGem } from '@/constants/explore-content';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
  },
  pressable: {
    gap: 0,
  },
  image: {
    width: '100%',
    height: 280,
    borderRadius: 20,
  },
  copy: {
    paddingHorizontal: 4,
    paddingTop: 20,
    paddingBottom: 10,
    gap: 8,
  },
  title: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '900',
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
