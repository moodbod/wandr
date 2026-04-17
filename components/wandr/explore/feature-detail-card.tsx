import { Image } from 'expo-image';
import { ArrowRight } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { designSystem } from '@/constants/design-system';
import type { ExploreFeatureDetail } from '@/constants/explore-content';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ExploreFeatureDetailCardProps = {
  card: ExploreFeatureDetail;
};

export function ExploreFeatureDetailCard({ card }: ExploreFeatureDetailCardProps) {
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
      <View style={styles.content}>
        <ThemedText style={styles.category}>{card.category}</ThemedText>
        <ThemedText style={styles.title}>{card.title}</ThemedText>
        <ThemedText style={styles.description}>{card.description}</ThemedText>
        <View style={styles.footer}>
          <View style={styles.priceRow}>
            <ThemedText style={styles.price}>{card.price}</ThemedText>
            <ThemedText style={styles.priceSuffix}>{card.priceSuffix}</ThemedText>
          </View>
          <ArrowRight color={designSystem.colors.lime} size={18} weight="bold" />
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
});
