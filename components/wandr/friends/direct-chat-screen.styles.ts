import { StyleSheet } from 'react-native';

import { designSystem } from '@/constants/design-system';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  hero: {
    gap: 4,
  },
  title: {
    fontSize: 32,
    lineHeight: 30,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
    color: designSystem.colors.gray,
  },
  notice: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.copper,
  },
});
