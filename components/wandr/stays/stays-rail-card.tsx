import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { GlassView } from '@/lib/glass-effect';

type StaysRailCardProps = {
  imageUri: string;
  isDark: boolean;
  isSelected: boolean;
  locationLabel?: string;
  name: string;
  presentation?: 'list' | 'floating';
  priceLabel: string;
  priceRateLabel?: string;
  rating: number;
};

export function StaysRailCard({
  imageUri,
  isDark,
  isSelected,
  locationLabel,
  name,
  presentation = 'list',
  priceLabel,
  priceRateLabel,
  rating,
}: StaysRailCardProps) {
  const isFloating = presentation === 'floating';

  return (
    <View
      style={[
        styles.propertyRow,
        isFloating && styles.propertyRowFloating,
        {
          backgroundColor: 'transparent',
          borderBottomColor: isFloating
            ? 'transparent'
            : isDark
              ? designSystem.colors.darkBorderSoft
              : designSystem.colors.borderSoft,
        },
      ]}
    >
      {isFloating ? (
        <GlassView
          glassEffectStyle="clear"
          isInteractive
          pointerEvents="none"
          style={styles.floatingGlassFill}
        />
      ) : null}
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
          {locationLabel ? (
            <ThemedText
              style={[styles.propertyLocation, isDark && styles.propertyLocationDark]}
              numberOfLines={1}
            >
              {locationLabel}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.propertyTitleBlock}>
          <ThemedText numberOfLines={2} style={[styles.propertyTitle, isDark && styles.propertyTitleDark]}>
            {name}
          </ThemedText>
          {priceRateLabel ? (
            <ThemedText numberOfLines={1} style={[styles.priceRateText, isDark && styles.priceRateTextDark]}>
              {priceRateLabel}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  propertyRow: {
    width: '100%',
    borderBottomWidth: 1,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  propertyRowFloating: {
    borderRadius: designSystem.radii.card,
    overflow: 'hidden',
    paddingHorizontal: 12,
    boxShadow: '0 10px 20px rgba(0,0,0,0.16)',
    elevation: 8,
  },
  floatingGlassFill: {
    ...({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }),
    borderRadius: designSystem.radii.card,
  },
  propertyImageShell: {
    width: 96,
    height: 96,
    borderRadius: 12,
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
  priceRateText: {
    color: designSystem.colors.gray,
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 15,
  },
  priceRateTextDark: {
    color: designSystem.colors.darkMutedText,
  },
  propertyBody: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  propertyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  propertyTitleBlock: {
    gap: 2,
  },
  propertyTitle: {
    fontSize: 18,
    lineHeight: 21,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  propertyTitleDark: {
    color: designSystem.colors.darkText,
  },
  propertyLocation: {
    flex: 1,
    minWidth: 0,
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
    flexShrink: 0,
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
