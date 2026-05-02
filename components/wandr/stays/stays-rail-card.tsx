import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

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
        <View style={styles.priceBadge}>
          <ThemedText
            lightColor={designSystem.colors.ink}
            darkColor={designSystem.colors.ink}
            style={styles.priceBadgeText}
          >
            {priceLabel}
          </ThemedText>
        </View>
      </View>

      <View style={styles.propertyBody}>
        <View style={styles.propertyMetaRow}>
          <View style={styles.ratingRow}>
            <ThemedText style={styles.ratingStar}>★</ThemedText>
            <ThemedText style={[styles.ratingText, isDark && styles.ratingTextDark]}>
              {rating.toFixed(1)}
            </ThemedText>
          </View>
          <ThemedText
            style={[styles.propertyLocation, isDark && styles.propertyLocationDark]}
            numberOfLines={1}
          >
            {locationLabel}
          </ThemedText>
        </View>

        <View style={styles.propertyTitleBlock}>
          <ThemedText numberOfLines={2} style={[styles.propertyTitle, isDark && styles.propertyTitleDark]}>
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
    backgroundColor: designSystem.colors.white,
    borderWidth: 1,
    borderColor: designSystem.colors.scrimWash,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    shadowColor: designSystem.colors.ink,
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
    borderColor: designSystem.colors.limeSoft,
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
  priceBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.whiteGlassHigh,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  priceBadgeText: {
    fontSize: 12,
    lineHeight: 12,
    fontWeight: '600',
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
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  propertyTitleDark: {
    color: designSystem.colors.darkText,
  },
  propertyLocation: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
  propertyLocationDark: {
    color: designSystem.colors.darkTextSoft,
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
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  ratingTextDark: {
    color: designSystem.colors.darkText,
  },
});
