import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { designSystem } from '@/constants/design-system';
import type { ExploreHiddenGem } from '@/constants/explore-content';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ExploreHiddenGemCardProps = {
  card: ExploreHiddenGem;
};

export function ExploreHiddenGemCard({ card }: ExploreHiddenGemCardProps) {
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
      <Image source={card.imageUri} contentFit="cover" style={styles.image} />
      <View style={styles.copy}>
        <ThemedText style={styles.title}>{card.title}</ThemedText>
        <ThemedText style={styles.description}>{card.description}</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 32,
    padding: 16,
    borderWidth: 1,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 20,
  },
  copy: {
    paddingHorizontal: 4,
    paddingTop: 20,
    paddingBottom: 4,
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
