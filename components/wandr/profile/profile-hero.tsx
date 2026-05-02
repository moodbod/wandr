import { Image as ExpoImage } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ProfileHeroProps = {
  avatarUri: string;
  baseLabel: string;
  displayName: string;
  planningLabel?: string | null;
};

export function ProfileHero({ avatarUri, baseLabel, displayName, planningLabel }: ProfileHeroProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? designSystem.semantic.dark : designSystem.semantic.light;

  return (
    <View style={styles.hero}>
      <ExpoImage source={{ uri: avatarUri }} style={[styles.avatar, { backgroundColor: colors.surface }]} contentFit="cover" />
      <View style={styles.copy}>
        <ThemedText adjustsFontSizeToFit numberOfLines={1} style={styles.name}>
          {displayName}
        </ThemedText>
        {baseLabel ? (
          <ThemedText numberOfLines={1} style={styles.baseLabel}>
            {baseLabel}
          </ThemedText>
        ) : null}
        {planningLabel ? (
          <ThemedText numberOfLines={1} style={styles.planningLabel}>
            Planning {planningLabel}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  name: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    color: designSystem.colors.ink,
  },
  baseLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.subtleText,
  },
  planningLabel: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    color: designSystem.colors.darkGreen,
  },
});
