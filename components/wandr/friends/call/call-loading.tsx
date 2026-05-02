import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

export function FullCallLoading({ label }: { label: string }) {
  return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator color={designSystem.colors.lime} />
      <ThemedText style={styles.loadingText}>{label}</ThemedText>
    </View>
  );
}

export function MiniCallLoading({ label }: { label: string }) {
  return (
    <View style={styles.miniVoice}>
      <ActivityIndicator color={designSystem.colors.lime} />
      <ThemedText style={styles.miniLoadingText}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 28,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 21,
    color: designSystem.colors.darkMutedText,
  },
  miniVoice: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  miniLoadingText: {
    marginTop: 6,
    maxWidth: 82,
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 12,
    color: designSystem.colors.darkMutedText,
  },
});
