import { Star } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TravelerAvatarStack } from '@/components/wandr/traveler-avatar-stack';
import { designSystem } from '@/constants/design-system';

type TravelerMomentumProps = {
  regionName: string;
  visitorCount: number;
  avatarUris: string[];
  rating?: number;
  reviewCount?: number;
  emptyLabel?: string;
};

export function TravelerMomentum({
  regionName,
  visitorCount,
  avatarUris,
  rating,
  reviewCount,
  emptyLabel,
}: TravelerMomentumProps) {
  const resolvedEmptyLabel =
    emptyLabel ?? (regionName ? `Be the first traveler from ${regionName} to visit` : 'Be the first traveler to visit');

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <TravelerAvatarStack avatars={avatarUris} totalCount={visitorCount} />

        {visitorCount > 0 ? (
          <ThemedText style={styles.summary}>
            {visitorCount === 1 ? '1 traveler' : `${visitorCount} travelers`}
            {regionName ? ` from ${regionName}` : ''}
            {' '}visited
          </ThemedText>
        ) : null}

        {visitorCount === 0 ? <ThemedText style={styles.summary}>{resolvedEmptyLabel}</ThemedText> : null}
      </View>

      {(rating !== undefined || reviewCount !== undefined) && (
        <View style={styles.right}>
          {rating !== undefined && (
            <View style={styles.ratingGroup}>
              <ThemedText style={styles.ratingText}>{rating.toFixed(1)}</ThemedText>
              <Star size={16} color={designSystem.colors.lime} weight="fill" />
            </View>
          )}
          {reviewCount !== undefined && (
            <ThemedText style={styles.reviewText}>({(reviewCount / 1000).toFixed(0)}k Reviews)</ThemedText>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summary: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    color: designSystem.colors.warmDark,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    ...designSystem.type.bodyStrong,
    fontSize: 16,
    color: designSystem.colors.ink,
  },
  reviewText: {
    ...designSystem.type.body,
    fontSize: 14,
    color: designSystem.colors.gray,
  },
});
