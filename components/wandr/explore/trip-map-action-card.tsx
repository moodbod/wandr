import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { MapPin } from 'phosphor-react-native';

import { ThemedText } from '@/components/themed-text';
import { MapFrame } from '@/components/wandr/maps/map-frame';
import { designSystem } from '@/constants/design-system';
import type { ExploreMapMarker } from '@/constants/explore-content';
import { useColorScheme } from '@/hooks/use-color-scheme';

type TripMapActionCardProps = {
  centerCoordinate: readonly [number, number];
  loadingAction?: 'primary' | 'secondary' | null;
  markers?: readonly ExploreMapMarker[];
  onPrimaryPress: () => void;
  onSecondaryPress?: () => void;
  primaryLabel: string;
  secondaryLabel?: string;
  subtitle: string;
  title: string;
  variant?: 'default' | 'webDetail';
};

export function TripMapActionCard({
  centerCoordinate,
  loadingAction = null,
  markers = [],
  onPrimaryPress,
  onSecondaryPress,
  primaryLabel,
  secondaryLabel,
  subtitle,
  title,
  variant = 'default',
}: TripMapActionCardProps) {
  const isDark = useColorScheme() === 'dark';
  const isPrimaryLoading = loadingAction === 'primary';
  const isSecondaryLoading = loadingAction === 'secondary';
  const isDisabled = loadingAction !== null;
  const isWebDetail = variant === 'webDetail' && Platform.OS === 'web';

  return (
    <View
      style={[
        styles.shell,
        isDark ? styles.shellDark : null,
        isWebDetail ? styles.webDetailShell : null,
      ]}
    >
      <MapFrame
        shellStyle={[styles.mapWrap, isWebDetail ? styles.webDetailMapWrap : null]}
        centerCoordinate={centerCoordinate}
        interactionEnabled={!isWebDetail}
        markers={markers}
        zoomLevel={isWebDetail ? 12.6 : 11.7}
      />
      <View style={[styles.actionPanel, isWebDetail ? styles.webDetailActionPanel : null]}>
        <View style={styles.copyStack}>
          <View style={styles.eyebrowRow}>
            <MapPin
              color={isDark ? designSystem.colors.darkTextSoft : designSystem.colors.darkGreen}
              size={15}
              weight="fill"
            />
            <ThemedText
              darkColor={designSystem.colors.darkTextSoft}
              lightColor={designSystem.colors.darkGreen}
              style={styles.eyebrow}
            >
              Trip plan
            </ThemedText>
          </View>
          <ThemedText
            darkColor={designSystem.colors.darkText}
            lightColor={designSystem.colors.ink}
            numberOfLines={2}
            style={styles.title}
          >
            {title}
          </ThemedText>
          <ThemedText
            darkColor={designSystem.colors.darkTextSoft}
            lightColor={designSystem.colors.mutedText}
            style={styles.subtitle}
          >
            {subtitle}
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={isDisabled}
            onPress={onPrimaryPress}
            style={({ pressed }) => [
              styles.primaryAction,
              isDisabled ? styles.actionDisabled : null,
              pressed && !isDisabled ? styles.actionPressed : null,
            ]}
          >
            <ThemedText
              adjustsFontSizeToFit
              lightColor={designSystem.colors.background}
              darkColor={designSystem.colors.background}
              minimumFontScale={0.84}
              numberOfLines={2}
              style={styles.primaryActionLabel}
            >
              {isPrimaryLoading ? 'Saving...' : primaryLabel}
            </ThemedText>
          </Pressable>
          {secondaryLabel && onSecondaryPress ? (
            <Pressable
              accessibilityRole="button"
              disabled={isDisabled}
              onPress={onSecondaryPress}
              style={({ pressed }) => [
                styles.secondaryAction,
                isDark ? styles.secondaryActionDark : null,
                isDisabled ? styles.actionDisabled : null,
                pressed && !isDisabled ? styles.actionPressed : null,
              ]}
            >
              <ThemedText
                adjustsFontSizeToFit
                darkColor={designSystem.colors.darkText}
                lightColor={designSystem.colors.ink}
                minimumFontScale={0.84}
                numberOfLines={2}
                style={styles.secondaryActionLabel}
              >
                {isSecondaryLoading ? 'Saving...' : secondaryLabel}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: designSystem.colors.surface,
    borderColor: designSystem.colors.borderSoft,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  shellDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
  },
  webDetailShell: {
    borderRadius: 18,
    marginHorizontal: -8,
  },
  mapWrap: {
    backgroundColor: designSystem.colors.surfaceMuted,
    height: 250,
    minHeight: 250,
    position: 'relative',
  },
  webDetailMapWrap: {
    height: 210,
    minHeight: 210,
  },
  actionPanel: {
    gap: 18,
    padding: 18,
  },
  webDetailActionPanel: {
    gap: 14,
    padding: 14,
  },
  copyStack: {
    gap: 7,
  },
  eyebrowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  actions: {
    gap: 10,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.darkGreen,
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: designSystem.spacing.md,
    paddingVertical: 10,
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.surfaceRaised,
    borderColor: designSystem.colors.borderSoft,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: designSystem.spacing.md,
    paddingVertical: 10,
  },
  secondaryActionDark: {
    backgroundColor: designSystem.colors.charcoalSoft,
    borderColor: designSystem.colors.darkBorderSoft,
  },
  actionPressed: {
    opacity: 0.82,
  },
  actionDisabled: {
    opacity: 0.55,
  },
  primaryActionLabel: {
    color: designSystem.colors.background,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
  secondaryActionLabel: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
});
