import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FaceHashAvatar } from '@/components/wandr/facehash-avatar';
import { TravelerAvatarStack } from '@/components/wandr/traveler-avatar-stack';
import { designSystem } from '@/constants/design-system';
import type { FriendChatListItem } from '@/types/friends';

const DIRECT_LEADING_WIDTH = 44;
const GROUP_LEADING_WIDTH = 72;
const DIRECT_ROW_GAP = designSystem.spacing.sm;
const GROUP_ROW_GAP = 10;

function formatRelativeTime(timestamp: number) {
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export function FriendChatListRow({
  item,
  onPress,
  onAvatarPress,
}: {
  item: FriendChatListItem;
  onPress: () => void;
  onAvatarPress?: () => void;
}) {
  const groupAvatarUris = item.avatarUris ?? [];

  return (
    <Pressable onPress={onPress} style={[styles.row, item.kind === 'group' ? styles.groupRow : null]}>
      <View style={[styles.leading, item.kind === 'group' ? styles.groupLeading : null]}>
        {item.kind === 'group' ? (
          <View style={styles.groupAvatarWrap}>
            <TravelerAvatarStack
              avatars={groupAvatarUris}
              fallbackName={item.title}
              fallbackPaletteKey={item.id}
              maxVisible={3}
              totalCount={item.memberCount ?? groupAvatarUris.length}
            />
          </View>
        ) : (
          <Pressable
            accessibilityLabel={`View ${item.title}'s profile`}
            disabled={!onAvatarPress}
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              onAvatarPress?.();
            }}
            style={styles.avatarButton}>
            <FaceHashAvatar
              name={item.title || item.travelerSlug || 'Traveler'}
              paletteKey={item.travelerSlug}
              size={44}
              uri={item.avatarUri}
              style={styles.avatar}
            />
          </Pressable>
        )}
      </View>

      <View style={[styles.body, item.kind === 'group' ? styles.groupBody : null]}>
        <View style={styles.head}>
          <View style={styles.identity}>
            <ThemedText
              style={[styles.title, item.kind === 'group' ? styles.groupTitle : null]}
              numberOfLines={1}>
              {item.title}
            </ThemedText>
            {item.subtitle ? (
              <ThemedText
                style={[styles.subtitle, item.kind === 'group' ? styles.groupSubtitle : null]}
                numberOfLines={1}>
                {item.subtitle}
              </ThemedText>
            ) : null}
          </View>
          <ThemedText style={styles.time}>{formatRelativeTime(item.updatedAt)}</ThemedText>
        </View>
        {item.preview ? (
          <ThemedText
            style={[styles.preview, item.kind === 'group' ? styles.groupPreview : null]}
            numberOfLines={1}>
            {item.preview}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: DIRECT_ROW_GAP,
  },
  groupRow: {
    gap: GROUP_ROW_GAP,
  },
  leading: {
    width: DIRECT_LEADING_WIDTH,
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  groupLeading: {
    width: GROUP_LEADING_WIDTH,
  },
  groupAvatarWrap: {
    width: GROUP_LEADING_WIDTH,
    paddingTop: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: designSystem.colors.surface,
  },
  avatarButton: {
    borderRadius: 22,
  },
  placeholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.scrimFaint,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    paddingTop: 2,
  },
  groupBody: {
    paddingTop: 0,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  title: {
    flexShrink: 1,
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  groupTitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  time: {
    flexShrink: 0,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
  subtitle: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 16,
    color: designSystem.colors.warmDark,
  },
  groupSubtitle: {
    fontSize: 14,
    lineHeight: 18,
    color: designSystem.colors.ink,
  },
  preview: {
    alignSelf: 'flex-start',
    maxWidth: '82%',
    fontSize: 13,
    lineHeight: 18,
    color: designSystem.colors.gray,
  },
  groupPreview: {
    maxWidth: '88%',
  },
});
