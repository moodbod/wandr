import { Star } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

type CompactProfile = {
  id: string;
  name: string;
};

type TravelerMomentumProps = {
  regionName: string;
  visitorCount: number;
  avatars: string[];
  rating?: number;
  reviewCount?: number;
  compact?: boolean;
  emptyLabel?: string;
  compactProfiles?: CompactProfile[];
  viewerName?: string;
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function TravelerMomentum({
  regionName,
  visitorCount,
  avatars,
  rating,
  reviewCount,
  compact = false,
  emptyLabel,
  compactProfiles = [],
  viewerName,
}: TravelerMomentumProps) {
  const displayAvatars = avatars.slice(0, 4);
  const remainingCount = Math.max(0, visitorCount - displayAvatars.length);
  const displayProfiles = compactProfiles.slice(0, 3);

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.left}>
        {compact ? (
          visitorCount > 0 ? (
            <View style={styles.avatarStack}>
              {displayProfiles.map((profile, i) => (
                <View
                  key={profile.id}
                  style={[
                    styles.initialAvatar,
                    styles.initialAvatarCompact,
                    { marginLeft: i === 0 ? 0 : -12, zIndex: 10 - i },
                  ]}>
                  <ThemedText style={styles.initialAvatarText}>{getInitials(profile.name)}</ThemedText>
                </View>
              ))}
              <View style={[styles.moreBadge, styles.moreBadgeCompact, { marginLeft: displayProfiles.length > 0 ? -12 : 0, zIndex: 0 }]}>
                <ThemedText style={[styles.moreText, styles.moreTextCompact]}>+</ThemedText>
              </View>
            </View>
          ) : viewerName ? (
            <View style={styles.avatarStack}>
              <View style={[styles.initialAvatar, styles.initialAvatarCompact]}>
                <ThemedText style={styles.initialAvatarText}>{getInitials(viewerName)}</ThemedText>
              </View>
            </View>
          ) : null
        ) : visitorCount > 0 ? (
          <View style={styles.avatarStack}>
            {displayAvatars.map((uri, i) => (
              <View 
                key={`avatar-${i}`} 
                style={[
                  styles.avatarWrapper, 
                  compact && styles.avatarWrapperCompact,
                  { marginLeft: i === 0 ? 0 : -12, zIndex: 10 - i }
                ]}
              >
                <ExpoImage source={uri} style={styles.avatar} contentFit="cover" />
              </View>
            ))}
            {remainingCount > 0 && (
              <View style={[styles.moreBadge, compact && styles.moreBadgeCompact, { marginLeft: -12, zIndex: 0 }]}>
              <ThemedText style={[styles.moreText, compact && styles.moreTextCompact]}>+{remainingCount}</ThemedText>
            </View>
          )}
        </View>
        ) : null}
        {compact ? visitorCount > 0 ? (
          <ThemedText style={styles.compactSummary}>
            {visitorCount === 1 ? '1 traveler' : `${visitorCount} travelers`}
            {regionName ? ` from ${regionName}` : ''}
            {' '}visited
          </ThemedText>
        ) : emptyLabel ? <ThemedText style={styles.compactSummary}>{emptyLabel}</ThemedText> : null : null}
      </View>

      {!compact && (rating !== undefined || reviewCount !== undefined) && (
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
  containerCompact: {
    paddingVertical: 0,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: designSystem.colors.surface,
  },
  avatarWrapperCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  initialAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.ink,
  },
  initialAvatarCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  initialAvatarText: {
    fontSize: 11,
    lineHeight: 11,
    fontWeight: '700',
    color: '#fff',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  moreBadge: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(14,15,12,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  moreBadgeCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 0,
  },
  moreText: {
    ...designSystem.type.bodyStrong,
    fontSize: 12,
    color: designSystem.colors.ink,
  },
  moreTextCompact: {
    fontSize: 11,
  },
  compactSummary: {
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
