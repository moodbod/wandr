import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

type JourneyCtaCardProps = {
  loadingAction?: 'primary' | 'secondary' | null;
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
  primaryLabel: string;
  secondaryLabel: string;
  title?: string;
  description?: string;
};

export function JourneyCtaCard({
  loadingAction = null,
  onPrimaryPress,
  onSecondaryPress,
  primaryLabel,
  secondaryLabel,
  title = 'Start your journey',
  description,
}: JourneyCtaCardProps) {
  const isPrimaryLoading = loadingAction === 'primary';
  const isSecondaryLoading = loadingAction === 'secondary';
  const isDisabled = loadingAction !== null;
  const hasDescription = Boolean(description);

  return (
    <View style={styles.card}>
      <ThemedText
        lightColor={designSystem.colors.darkGreen}
        darkColor={designSystem.colors.darkGreen}
        style={[styles.title, hasDescription ? styles.titleWithDescription : null]}>
        {title}
      </ThemedText>
      {description ? (
        <ThemedText
          lightColor="rgba(22,51,0,0.72)"
          darkColor="rgba(22,51,0,0.72)"
          style={styles.description}>
          {description}
        </ThemedText>
      ) : null}
      <View style={styles.actions}>
        <Pressable disabled={isDisabled} onPress={onPrimaryPress} style={styles.primaryAction}>
          <ThemedText lightColor="#f9f9f6" darkColor="#f9f9f6" style={styles.primaryActionLabel}>
            {isPrimaryLoading ? 'Saving...' : primaryLabel}
          </ThemedText>
        </Pressable>
        <Pressable disabled={isDisabled} onPress={onSecondaryPress} style={styles.secondaryAction}>
          <ThemedText
            lightColor={designSystem.colors.darkGreen}
            darkColor={designSystem.colors.darkGreen}
            style={styles.secondaryActionLabel}>
            {isSecondaryLoading ? 'Saving...' : secondaryLabel}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: designSystem.radii.feature,
    backgroundColor: designSystem.colors.lime,
    paddingHorizontal: 24,
    paddingVertical: 30,
    alignItems: 'center',
    gap: 24,
  },
  title: {
    textAlign: 'center',
    fontSize: 54,
    lineHeight: 52,
    fontWeight: '900',
    letterSpacing: -2.4,
    textTransform: 'uppercase',
    color: designSystem.colors.darkGreen,
  },
  titleWithDescription: {
    fontSize: 42,
    lineHeight: 42,
    letterSpacing: -1.8,
  },
  description: {
    marginTop: -10,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: 'rgba(22,51,0,0.72)',
    maxWidth: 320,
  },
  actions: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  primaryAction: {
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 232,
    paddingHorizontal: 28,
    paddingVertical: 18,
  },
  primaryActionLabel: {
    fontSize: 15,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#f9f9f6',
  },
  secondaryAction: {
    borderRadius: designSystem.radii.pill,
    backgroundColor: 'rgba(23, 25, 21, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 232,
    paddingHorizontal: 28,
    paddingVertical: 18,
  },
  secondaryActionLabel: {
    fontSize: 15,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: designSystem.colors.darkGreen,
  },
});
