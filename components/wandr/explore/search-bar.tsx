import { StyleSheet, TextInput, View } from 'react-native';
import { MagnifyingGlass } from 'phosphor-react-native';

import { designSystem } from '@/constants/design-system';
import { useThemeColor } from '@/hooks/use-theme-color';

type ExploreSearchBarProps = {
  placeholder: string;
};

export function ExploreSearchBar({ placeholder }: ExploreSearchBarProps) {
  const backgroundColor = useThemeColor(
    { light: '#f4f4f1', dark: designSystem.colors.darkSurface },
    'card'
  );
  const textColor = useThemeColor(
    { light: designSystem.colors.ink, dark: designSystem.colors.darkText },
    'text'
  );
  const placeholderTextColor = useThemeColor(
    { light: 'rgba(14,15,12,0.35)', dark: 'rgba(249,249,246,0.35)' },
    'icon'
  );

  return (
    <View style={[styles.shell, { backgroundColor }]}>
      <MagnifyingGlass color={placeholderTextColor} size={22} weight="bold" />
      <TextInput
        editable={false}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        style={[styles.input, { color: textColor }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 32,
    paddingHorizontal: 20,
    paddingVertical: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  input: {
    flex: 1,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
  },
});
