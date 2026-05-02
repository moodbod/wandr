import { CaretDown, GlobeHemisphereWest } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassButton } from '@/components/ui/glass-button';
import { designSystem } from '@/constants/design-system';
import { type PlanningLocation } from '@/constants/planning-countries';
import { useColorScheme } from '@/hooks/use-color-scheme';

type HeaderLocationSelectorProps = {
  location: PlanningLocation;
  onPress: () => void;
};

export function HeaderLocationSelector({ location, onPress }: HeaderLocationSelectorProps) {
  const isDark = useColorScheme() === 'dark';
  const textColor = isDark ? designSystem.colors.darkText : designSystem.colors.ink;

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
        <GlobeHemisphereWest color={textColor} size={18} weight="bold" />
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
  content: {
    height: '100%',
    paddingLeft: 14,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  copy: {
    flexShrink: 1,
  },
  label: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700',
  },
});
