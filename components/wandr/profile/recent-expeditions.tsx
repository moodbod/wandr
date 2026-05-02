import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ProfilePlaceItem } from '@/types/trip';

import { fallbackTripImages } from './profile-data';

type ProfileSemanticColors = (typeof designSystem.semantic)[keyof typeof designSystem.semantic];

type RecentExpeditionsProps = {
  emptyBody: string;
  emptyTitle: string;
  items: ProfilePlaceItem[];
  title: string;
};

export function RecentExpeditions({ emptyBody, emptyTitle, items, title }: RecentExpeditionsProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? designSystem.semantic.dark : designSystem.semantic.light;

  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <View style={styles.tripList}>
        {items.length > 0 ? (
          items.map((item, index) => <ExpeditionRow colors={colors} item={item} key={item._id} index={index} />)
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <ThemedText style={styles.emptyTitle}>{emptyTitle}</ThemedText>
            <ThemedText style={styles.emptyBody}>{emptyBody}</ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

function ExpeditionRow({
  colors,
  index,
  item,
}: {
  colors: ProfileSemanticColors;
  index: number;
  item: ProfilePlaceItem;
}) {
  const router = useRouter();
  const imageUri = item.imageUri ?? fallbackTripImages[index % fallbackTripImages.length];
  const dateLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(
    new Date(item.createdAt)
  );

  return (
    <Pressable
      onPress={() => {
        if (item.kind === 'stay') {
          router.push({ pathname: '/stays/details', params: { slug: item.slug } });
          return;
        }

        if (item.kind === 'hiddenGem') {
          router.push({ pathname: '/explore/hidden-gems/[slug]', params: { slug: item.slug } });
          return;
        }

        router.push({ pathname: '/explore/[slug]', params: { slug: item.slug } });
      }}
      style={styles.tripRow}>
      <ExpoImage source={{ uri: imageUri }} style={[styles.tripImage, { backgroundColor: colors.surface }]} contentFit="cover" />
      <View style={styles.tripTextWrap}>
        <ThemedText numberOfLines={2} style={styles.tripTitle}>
          {item.title}
        </ThemedText>
        <ThemedText numberOfLines={1} style={styles.tripSubtitle}>
          {dateLabel} · {item.subtitle}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  tripList: {
    gap: 16,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  tripImage: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  tripTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  tripTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  tripSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.subtleText,
  },
  emptyState: {
    gap: 6,
    padding: 18,
    borderRadius: 22,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 18,
    color: designSystem.colors.warmDark,
  },
});
