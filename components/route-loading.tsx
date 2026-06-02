import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function RouteLoading() {
  const isDark = useColorScheme() === 'dark';
  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: isDark
            ? designSystem.semantic.dark.background
            : designSystem.semantic.light.background,
        },
      ]}
    >
      <ActivityIndicator color={designSystem.colors.lime} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
