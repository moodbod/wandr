import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowUpRight } from 'phosphor-react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

type ExploreSectionHeadingProps = {
  title: string;
  actionLabel?: string;
  actionHref?: Href;
};

export function ExploreSectionHeading({ title, actionLabel, actionHref }: ExploreSectionHeadingProps) {
  return (
    <View style={styles.row}>
      <ThemedText style={styles.title}>{title}</ThemedText>
      {actionLabel && actionHref ? (
        <Link href={actionHref} asChild>
          <Pressable style={styles.action}>
            <ThemedText style={styles.actionLabel}>{actionLabel}</ThemedText>
            <ArrowUpRight color={designSystem.colors.lime} size={16} weight="bold" />
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: designSystem.spacing.md,
  },
  title: {
    flex: 1,
    fontSize: 34,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -1,
    textTransform: 'uppercase',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionLabel: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: designSystem.colors.lime,
  },
});
