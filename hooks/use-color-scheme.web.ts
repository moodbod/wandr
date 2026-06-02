import { useColorScheme as useRNColorScheme } from 'react-native';
import type { ColorSchemeName } from 'react-native';

export function useColorScheme(): NonNullable<ColorSchemeName> {
  return useRNColorScheme() ?? 'light';
}
