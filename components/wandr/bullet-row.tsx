import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

type WandrBulletRowProps = {
  children: string;
};

export function WandrBulletRow({ children }: WandrBulletRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.dot} />
      <ThemedText style={styles.text}>{children}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.lime,
    marginTop: 8,
  },
  text: {
    flex: 1,
    ...designSystem.type.cardBody,
  },
});
