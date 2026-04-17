import { Image } from 'expo-image';
import { ArrowRight } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { designSystem } from '@/constants/design-system';
import type { ExploreFeatureDetail } from '@/constants/explore-content';

type ExploreFeatureDetailCardProps = {
  card: ExploreFeatureDetail;
};

export function ExploreFeatureDetailCard({ card }: ExploreFeatureDetailCardProps) {
  return (
    <ThemedView lightColor="#f4f4f1" darkColor={designSystem.colors.darkSurface} style={styles.shell}>
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
          <ArrowRight color={designSystem.colors.darkGreen} size={18} weight="bold" />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 420,
    borderRadius: 32,
    overflow: 'hidden',
  },
  image: {
    height: 210,
    width: '100%',
  },
  content: {
    flex: 1,
    padding: 24,
    gap: 10,
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
