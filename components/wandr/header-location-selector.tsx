import { CaretDown } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassButton } from '@/components/ui/glass-button';
import { CountryFlagAvatar } from '@/components/wandr/country-flag-avatar';
import { designSystem } from '@/constants/design-system';
import { type PlanningLocation } from '@/constants/planning-countries';
import { useColorScheme } from '@/hooks/use-color-scheme';

type HeaderLocationSelectorProps = {
  location: PlanningLocation;
  onPress: () => void;
  variant?: 'default' | 'desktopMap';
};

export function HeaderLocationSelector({ location, onPress, variant = 'default' }: HeaderLocationSelectorProps) {
  const isDark = useColorScheme() === 'dark';
  const isDesktopMap = variant === 'desktopMap';
  const textColor = isDesktopMap
    ? isDark
      ? designSystem.colors.darkTextWarm
      : designSystem.colors.ink
    : isDark
      ? designSystem.colors.darkText
      : designSystem.colors.ink;
  const desktopSurfaceColor = isDark ? 'rgba(255, 255, 255, 0.06)' : designSystem.colors.whiteGlassStrong;
  const desktopBorderColor = isDark ? designSystem.colors.whiteOverlayBarely : designSystem.colors.borderSoft;

  if (isDesktopMap) {
    return (
      <Pressable
        accessibilityLabel="Change planning location"
        accessibilityRole="button"
        onPress={onPress}
        style={[
          styles.desktopSelector,
          {
            backgroundColor: desktopSurfaceColor,
            borderColor: desktopBorderColor,
          },
        ]}
      >
        <View style={styles.desktopContent}>
          {location.countryCode ? (
            <CountryFlagAvatar countryCode={location.countryCode} size={28} />
          ) : null}
          <View style={styles.copy}>
            <ThemedText numberOfLines={1} style={[styles.label, styles.desktopLabel, { color: textColor }]}>
              {location.label}
            </ThemedText>
          </View>
          <CaretDown color={textColor} size={16} weight="bold" />
        </View>
      </Pressable>
    );
  }

  return (
    <GlassButton
      accessibilityLabel="Change planning location"
      height={48}
      onPress={onPress}
      radius={designSystem.radii.pill}
      style={styles.selector}
      width={undefined}
    >
      <View style={styles.content}>
        {location.countryCode ? (
          <CountryFlagAvatar countryCode={location.countryCode} size={34} />
        ) : null}
        <View style={styles.copy}>
          <ThemedText numberOfLines={1} style={[styles.label, { color: textColor }]}>
            {location.label}
          </ThemedText>
        </View>
        <CaretDown color={textColor} size={16} weight="bold" />
      </View>
    </GlassButton>
  );
}

const styles = StyleSheet.create({
  selector: {
    width: 'auto',
    minWidth: 132,
    maxWidth: 230,
    shadowColor: designSystem.colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
  },
  desktopSelector: {
    height: 42,
    width: '100%',
    minWidth: 148,
    maxWidth: 184,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    height: '100%',
    paddingLeft: 8,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  desktopContent: {
    height: '100%',
    paddingLeft: 7,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  copy: {
    flexShrink: 1,
  },
  label: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
  },
  desktopLabel: {
    fontSize: 13,
    lineHeight: 16,
  },
});
