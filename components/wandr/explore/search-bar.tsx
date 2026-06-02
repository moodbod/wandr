import { StyleSheet } from 'react-native';
import { MagnifyingGlass } from 'phosphor-react-native';

import { Input } from '@/components/ui/input';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ExploreSearchBarProps = {
  placeholder: string;
};

export function ExploreSearchBar({ placeholder }: ExploreSearchBarProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <Input
      editable={false}
      placeholder={placeholder}
      leftIcon={
        <MagnifyingGlass
          color={isDark ? designSystem.colors.darkPlaceholderText : designSystem.colors.placeholderText}
          size={18}
          weight="regular"
        />
      }
      containerStyle={styles.input}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    width: '100%',
  },
});
