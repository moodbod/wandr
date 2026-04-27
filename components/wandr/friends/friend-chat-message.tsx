import { Image as ExpoImage } from 'expo-image';
import { MapTrifold, Signpost } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import type { FriendChatMessage } from '@/types/friends';

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function FriendChatMessageBubble({ message }: { message: FriendChatMessage }) {
  if (message.kind === 'system') {
    return (
      <View style={styles.systemRow}>
        <ThemedText style={styles.systemText}>{message.body}</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.messageWrap, message.isOwnMessage ? styles.messageWrapOwn : null]}>
      {!message.isOwnMessage ? (
        <View style={styles.senderRow}>
          {message.senderAvatarUri ? <ExpoImage source={message.senderAvatarUri} style={styles.senderAvatar} contentFit="cover" /> : null}
          <ThemedText style={styles.senderName}>{message.senderName}</ThemedText>
        </View>
      ) : null}

      {message.routeCard ? (
        <View style={[styles.routeCard, message.isOwnMessage ? styles.routeCardOwn : null]}>
          <View style={styles.routeIconWrap}>
            <MapTrifold color={designSystem.colors.darkGreen} size={22} weight="bold" />
          </View>
          <View style={styles.routeCopy}>
            <ThemedText style={styles.routeTitle}>{message.routeCard.title}</ThemedText>
            <ThemedText style={styles.routeSummary}>{message.routeCard.summary}</ThemedText>
            <View style={styles.routeMeta}>
              <Signpost color={designSystem.colors.gray} size={14} weight="bold" />
              <ThemedText style={styles.routeMetaText}>
                {message.routeCard.distanceLabel}
              </ThemedText>
            </View>
            {message.routeCard.stopsPreview.length > 0 ? (
              <ThemedText style={styles.routeStops}>
                {message.routeCard.stopsPreview.join(' • ')}
              </ThemedText>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={[styles.bubble, message.isOwnMessage ? styles.bubbleOwn : styles.bubbleOther]}>
          <ThemedText style={[styles.bubbleText, message.isOwnMessage ? styles.bubbleTextOwn : null]}>
            {message.body}
          </ThemedText>
        </View>
      )}

      <ThemedText style={[styles.timeText, message.isOwnMessage ? styles.timeTextOwn : null]}>
        {formatTime(message.createdAt)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  systemRow: {
    alignItems: 'center',
    marginVertical: 6,
  },
  systemText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: designSystem.colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  messageWrap: {
    maxWidth: '84%',
    gap: 6,
  },
  messageWrapOwn: {
    alignSelf: 'flex-end',
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: designSystem.colors.surface,
  },
  senderName: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '800',
    color: designSystem.colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bubble: {
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  bubbleOwn: {
    backgroundColor: designSystem.colors.lime,
    borderTopRightRadius: 8,
  },
  bubbleOther: {
    backgroundColor: designSystem.colors.ink,
    borderTopLeftRadius: 8,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.background,
  },
  bubbleTextOwn: {
    color: designSystem.colors.darkGreen,
  },
  routeCard: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderRadius: 28,
    borderTopRightRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(14,15,12,0.08)',
  },
  routeCardOwn: {
    borderTopRightRadius: 8,
  },
  routeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(159,232,112,0.18)',
  },
  routeCopy: {
    flex: 1,
    gap: 6,
  },
  routeTitle: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '800',
    color: designSystem.colors.ink,
    textTransform: 'uppercase',
  },
  routeSummary: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.warmDark,
  },
  routeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeMetaText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    color: designSystem.colors.gray,
  },
  routeStops: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  timeText: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '700',
    color: 'rgba(14,15,12,0.35)',
    marginLeft: 8,
  },
  timeTextOwn: {
    alignSelf: 'flex-end',
    marginLeft: 0,
    marginRight: 8,
  },
});
