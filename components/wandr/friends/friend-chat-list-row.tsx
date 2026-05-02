import { Image as ExpoImage } from 'expo-image';
import { ChatCircleDots } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
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
  return (
    <Pressable onPress={onPress} style={[styles.row, item.kind === 'group' ? styles.groupRow : null]}>
      <View style={[styles.leading, item.kind === 'group' ? styles.groupLeading : null]}>
        {item.kind === 'group' ? (
          <View style={styles.groupAvatarWrap}>
            <TravelerAvatarStack avatars={item.avatarUris ?? []} totalCount={(item.avatarUris ?? []).length || 2} />
          </View>
        ) : item.avatarUri ? (
          <Pressable
            accessibilityLabel={`View ${item.title}'s profile`}
            disabled={!onAvatarPress}
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              onAvatarPress?.();
            }}
            style={styles.avatarButton}>
            <ExpoImage source={item.avatarUri} style={styles.avatar} contentFit="cover" />
          </Pressable>
        ) : (
          <Pressable
            accessibilityLabel={`View ${item.title}'s profile`}
            disabled={!onAvatarPress}
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              onAvatarPress?.();
            }}
            style={styles.placeholder}>
            <ChatCircleDots color={designSystem.colors.gray} size={18} weight="bold" />
          </Pressable>
        )}
      </View>

      <View style={[styles.body, item.kind === 'group' ? styles.groupBody : null]}>
        <View style={styles.head}>
          <ThemedText
            style={[styles.title, item.kind === 'group' ? styles.groupTitle : null]}
            numberOfLines={1}>
            {item.title}
          </ThemedText>
          <ThemedText style={styles.time}>{formatRelativeTime(item.updatedAt)}</ThemedText>
        </View>
        <ThemedText
          style={[styles.subtitle, item.kind === 'group' ? styles.groupSubtitle : null]}
          numberOfLines={1}>
          {item.subtitle}
        </ThemedText>
        {item.preview ? (
          <ThemedText style={styles.preview} numberOfLines={1}>
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
  title: {
    flex: 1,
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
    fontSize: 13,
    lineHeight: 18,
    color: designSystem.colors.gray,
  },
});
