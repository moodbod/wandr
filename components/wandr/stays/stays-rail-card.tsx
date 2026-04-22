import { Image } from 'expo-image';
import { HeartStraight } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

type StaysRailCardProps = {
  imageUri: string;
  isDark: boolean;
  isSelected: boolean;
  locationLabel: string;
  name: string;
  priceLabel: string;
  rating: number;
};

export function StaysRailCard({
  imageUri,
  isDark,
  isSelected,
  locationLabel,
  name,
  priceLabel,
  rating,
}: StaysRailCardProps) {
  return (
    <View
      style={[
        styles.propertyCard,
        isDark && styles.propertyCardDark,
        isSelected && styles.propertyCardSelected,
      ]}
    >
      <View style={styles.propertyImageShell}>
        <Image source={imageUri} contentFit="cover" style={styles.propertyImage} />
        <Pressable style={styles.favoriteButton}>
          <HeartStraight size={24} color="#ffffff" weight="regular" />
        </Pressable>
        <View style={styles.priceBadge}>
          <ThemedText style={styles.priceBadgeText}>{priceLabel}</ThemedText>
        </View>
      </View>

      <View style={styles.propertyBody}>
        <View style={styles.propertyMetaRow}>
          <View style={styles.ratingRow}>
            <ThemedText style={styles.ratingStar}>★</ThemedText>
            <ThemedText style={styles.ratingText}>{rating.toFixed(1)}</ThemedText>
          </View>
          <ThemedText style={styles.propertyLocation} numberOfLines={1}>
            {locationLabel}
          </ThemedText>
        </View>

        <View style={styles.propertyTitleBlock}>
          <ThemedText numberOfLines={2} style={styles.propertyTitle}>
            {name}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  propertyCard: {
    width: '100%',
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(14,15,12,0.05)',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    shadowColor: '#0e0f0c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  propertyCardDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorder,
  },
  propertyCardSelected: {
    borderColor: 'rgba(159,232,112,0.35)',
  },
  propertyImageShell: {
    width: 118,
    height: 118,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  propertyImage: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(14,15,12,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    borderRadius: designSystem.radii.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  priceBadgeText: {
    fontSize: 12,
    lineHeight: 12,
    fontWeight: '800',
    color: designSystem.colors.ink,
  },
  propertyBody: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingRight: 4,
    paddingBottom: 4,
    gap: 8,
  },
  propertyMetaRow: {
    gap: 8,
  },
  propertyTitleBlock: {
    flex: 1,
    gap: 2,
  },
  propertyTitle: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '700',
    color: designSystem.colors.ink,
  },
  propertyLocation: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
  },
  ratingStar: {
    fontSize: 12,
    lineHeight: 12,
    color: designSystem.colors.lime,
  },
  ratingText: {
    fontSize: 12,
    lineHeight: 12,
    fontWeight: '700',
    color: designSystem.colors.ink,
  },
});
