import { StyleSheet } from 'react-native';

import { GlassInput } from '@/components/ui/glass-input';

type ExploreSearchBarProps = {
  placeholder: string;
};

export function ExploreSearchBar({ placeholder }: ExploreSearchBarProps) {
  return (
    <GlassInput
      editable={false}
      placeholder={placeholder}
      intensity={70}
      containerStyle={styles.input}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    width: '100%',
  },
});
