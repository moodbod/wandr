import { StyleSheet } from 'react-native';

import { GlassInput } from '@/components/ui/glass-input';

type ExploreSearchBarProps = {
  placeholder: string;
};

export function ExploreSearchBar({ placeholder }: ExploreSearchBarProps) {
  return (
    <GlassInput
      containerStyle={styles.shell}
      editable={false}
      placeholder={placeholder}
      style={styles.input}
    />
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 64,
  },
  input: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
  },
});
