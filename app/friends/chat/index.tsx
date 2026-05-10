import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BottomSheet, { BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { Check, FadersHorizontal } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DirectChatScreen from '@/app/friends/direct/[threadId]';
import FriendsChatScreen from '@/app/friends/group/[circleId]';
import FriendViewerProfileScreen from '@/app/friends/profile/[travelerSlug]';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassInput } from '@/components/ui/glass-input';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { SegmentedTabs, SegmentedTabsAccessory } from '@/components/ui/segmented-tabs';
import { WandrAvatar } from '@/components/wandr/avatar';
import { FriendChatListRow } from '@/components/wandr/friends/friend-chat-list-row';
import { WandrHeader } from '@/components/wandr/header';
import { LargeScreenPanel, LargeScreenWorkspace } from '@/components/wandr/large-screen-workspace';
import { AppMapWorkspace } from '@/components/wandr/maps/app-map-workspace';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useFriendsBootstrap } from '@/hooks/use-friends-bootstrap';
import { useResponsive } from '@/hooks/use-responsive';
import { createOpenFriendGroupRef, getFriendChatListRef, listUserTripsRef } from '@/lib/convex';
import type { FriendChatListItem, JoinableFriendGroup } from '@/types/friends';

type ChatFilter = 'primary' | 'groups' | 'chats';
type ChatDetail =
  | { kind: 'direct'; id: string }
  | { kind: 'group'; id: string }
  | { kind: 'profile'; slug: string };

const chatFilters: { key: ChatFilter; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'groups', label: 'Groups' },
  { key: 'chats', label: 'Chats' },
];

export default function FriendsChatListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    directThreadId?: string | string[];
    groupCircleId?: string | string[];
  }>();
  const isDark = useColorScheme() === 'dark';
  const { isLargeScreen } = useResponsive();
  const traveler = useCurrentTraveler();
  const { bootstrapError } = useFriendsBootstrap(traveler?.slug);
  const chatList = useQuery(getFriendChatListRef, traveler?.slug ? { travelerSlug: traveler.slug } : 'skip');
  const trips = useQuery(listUserTripsRef, traveler?.slug ? { travelerSlug: traveler.slug } : 'skip');
  const createGroup = useMutation(createOpenFriendGroupRef);
  const sheetRef = useRef<BottomSheet>(null);
  const [groupName, setGroupName] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedFriendSlugs, setSelectedFriendSlugs] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ChatFilter>('primary');
  const [searchQuery, setSearchQuery] = useState('');
  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const directThreadId = Array.isArray(params.directThreadId) ? params.directThreadId[0] : params.directThreadId;
  const groupCircleId = Array.isArray(params.groupCircleId) ? params.groupCircleId[0] : params.groupCircleId;

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    const groups = chatList?.groups ?? [];
    if (!normalizedSearchQuery) {
      return groups;
    }

    return groups.filter((item: any) =>
      [item.title, item.subtitle, item.preview ?? ''].some((value: string) =>
        value.toLowerCase().includes(normalizedSearchQuery)
      )
    );
  }, [chatList?.groups, normalizedSearchQuery]);
  const filteredJoinableGroups = useMemo(() => {
    const groups = chatList?.joinableGroups ?? [];
    if (!normalizedSearchQuery) {
      return groups;
    }

    return groups.filter((item: JoinableFriendGroup) =>
      [item.title, item.subtitle, item.preview ?? ''].some((value) =>
        value.toLowerCase().includes(normalizedSearchQuery)
      )
    );
  }, [chatList?.joinableGroups, normalizedSearchQuery]);
  const filteredDirects = useMemo(() => {
    const directs = chatList?.directs ?? [];
    if (!normalizedSearchQuery) {
      return directs;
    }

    return directs.filter((item: any) =>
      [item.title, item.subtitle, item.preview ?? ''].some((value: string) =>
        value.toLowerCase().includes(normalizedSearchQuery)
      )
    );
  }, [chatList?.directs, normalizedSearchQuery]);
  const showGroups = activeFilter === 'primary' || activeFilter === 'groups';
  const showDirects = activeFilter === 'primary' || activeFilter === 'chats';

  useEffect(() => {
    if (!isLargeScreen) {
      return;
    }

    if (directThreadId) {
      setDetail((current) =>
        current?.kind === 'direct' && current.id === directThreadId
          ? current
          : { kind: 'direct', id: directThreadId }
      );
      return;
    }

    if (groupCircleId) {
      setDetail((current) =>
        current?.kind === 'group' && current.id === groupCircleId
          ? current
          : { kind: 'group', id: groupCircleId }
      );
    }
  }, [directThreadId, groupCircleId, isLargeScreen]);

  const handleCreateGroup = async () => {
    sheetRef.current?.snapToIndex(0);
  };

  const toggleSelectedFriend = (friendSlug: string) => {
    setSelectedFriendSlugs((current) =>
      current.includes(friendSlug)
        ? current.filter((slug) => slug !== friendSlug)
        : [...current, friendSlug]
    );
  };

  const handleSubmitCreateGroup = async () => {
    if (!traveler?.slug) {
      return;
    }

    setIsCreatingGroup(true);
    try {
      const circleId = await createGroup({
        travelerSlug: traveler.slug,
        name: groupName.trim() || undefined,
        tripId: selectedTripId ? (selectedTripId as never) : undefined,
        inviteeSlugs: selectedFriendSlugs,
      });
      if (circleId) {
        setGroupName('');
        setSelectedTripId(null);
        setSelectedFriendSlugs([]);
        sheetRef.current?.close();
        if (isLargeScreen) {
          setDetail({ kind: 'group', id: String(circleId) });
          return;
        }
        router.push(`/friends/group/${circleId}` as never);
      }
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const openChatItem = (item: { href?: string }) => {
    const href = item.href ?? '';
    const groupId = href.match(/\/friends\/group\/([^/?#]+)/)?.[1];
    const directId = href.match(/\/friends\/direct\/([^/?#]+)/)?.[1];

    if (isLargeScreen) {
      if (groupId) {
        setDetail({ kind: 'group', id: decodeURIComponent(groupId) });
        return;
      }

      if (directId) {
        setDetail({ kind: 'direct', id: decodeURIComponent(directId) });
        return;
      }
    }

    if (href) {
      router.push(href as never);
    }
  };

  const openProfile = (travelerSlug: string) => {
    if (isLargeScreen) {
      setDetail({ kind: 'profile', slug: travelerSlug });
      return;
    }

    router.push(`/friends/profile/${travelerSlug}` as never);
  };

  const chatListContent = (
    <>
      {!isLargeScreen ? (
        <WandrHeader
          config={{
            overlay: true,
            leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
            trailingActions: [
              { kind: 'plus', accessibilityLabel: 'Create group', onPress: handleCreateGroup },
              { kind: 'notifications', accessibilityLabel: 'Notifications' },
            ],
          }}
        />
      ) : null}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: isLargeScreen ? insets.top + 24 : insets.top + 72,
            paddingBottom: insets.bottom + 80,
          },
        ]}>
        {bootstrapError ? <ThemedText style={styles.notice}>{bootstrapError}</ThemedText> : null}

        {isLargeScreen ? (
          <View style={styles.largeHeaderRow}>
            <View style={styles.largeTitleBlock}>
              <ThemedText
                style={[
                  styles.largeTitle,
                  { color: isDark ? designSystem.colors.darkText : designSystem.colors.ink },
                ]}
              >
                Chats
              </ThemedText>
              <ThemedText
                style={[
                  styles.largeSubtitle,
                  { color: isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray },
                ]}
              >
                Groups and direct messages
              </ThemedText>
            </View>
            <Pressable accessibilityRole="button" onPress={handleCreateGroup} style={styles.largeCreateButton}>
              <ThemedText style={styles.largeCreateButtonText}>New</ThemedText>
            </Pressable>
          </View>
        ) : null}

        <GlassInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search chats"
          returnKeyType="search"
        />

        <SegmentedTabs
          value={activeFilter}
          options={chatFilters}
          onChange={setActiveFilter}
          leadingAccessory={
            <SegmentedTabsAccessory>
            <FadersHorizontal color={isDark ? designSystem.colors.darkText : designSystem.colors.ink} size={18} weight="bold" />
            </SegmentedTabsAccessory>
          }
        />

        {showGroups && filteredGroups.length ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Groups</ThemedText>
            <View style={styles.rowList}>
              {filteredGroups.map((item: FriendChatListItem) => (
                <FriendChatListRow key={item.id} item={item} onPress={() => openChatItem(item)} />
              ))}
            </View>
          </View>
        ) : null}

        {showGroups && filteredJoinableGroups.length ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Open groups</ThemedText>
            <View style={styles.rowList}>
              {filteredJoinableGroups.map((item: JoinableFriendGroup) => (
                <FriendChatListRow key={item.id} item={item} onPress={() => openChatItem(item)} />
              ))}
            </View>
          </View>
        ) : null}

        {showDirects && filteredDirects.length ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Chats</ThemedText>
            <View style={styles.rowList}>
              {filteredDirects.map((item: any) => (
                <FriendChatListRow
                  key={item.id}
                  item={item}
                  onAvatarPress={
                    item.travelerSlug
                      ? () => openProfile(item.travelerSlug)
                      : undefined
                  }
                  onPress={() => openChatItem(item)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {(showGroups ? filteredGroups.length + filteredJoinableGroups.length : 0) + (showDirects ? filteredDirects.length : 0) === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyTitle}>No chats yet</ThemedText>
            <ThemedText style={styles.emptyDescription}>
              Try another filter or start a group.
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </>
  );

  const detailContent = detail?.kind === 'direct' ? (
    <DirectChatScreen onClose={() => setDetail(null)} threadId={detail.id} />
  ) : detail?.kind === 'group' ? (
    <FriendsChatScreen circleId={detail.id} onClose={() => setDetail(null)} />
  ) : detail?.kind === 'profile' ? (
    <FriendViewerProfileScreen onClose={() => setDetail(null)} travelerSlug={detail.slug} />
  ) : null;

  return (
    <ThemedView style={styles.root}>
      {isLargeScreen ? (
        <LargeScreenWorkspace mapContent={<AppMapWorkspace />}>
          <LargeScreenPanel kind="main">
            {chatListContent}
          </LargeScreenPanel>
          {detailContent ? (
            <LargeScreenPanel kind="detail">
              {detailContent}
            </LargeScreenPanel>
          ) : null}
        </LargeScreenWorkspace>
      ) : (
        chatListContent
      )}

      <GlassBottomSheet ref={sheetRef} index={-1} snapPoints={['68%']} enablePanDownToClose>
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <ThemedText style={styles.sheetTitle}>Create group</ThemedText>
            <ThemedText style={styles.sheetDescription}>Invite friends now or start an open group.</ThemedText>
          </View>
          <BottomSheetTextInput
            style={[styles.sheetInput, isDark ? styles.sheetInputDark : null]}
            placeholder="Group name"
            placeholderTextColor={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
            value={groupName}
            onChangeText={setGroupName}
          />
          <View style={styles.sheetSection}>
            <ThemedText style={styles.sheetSectionTitle}>Friends</ThemedText>
            <ScrollView style={styles.friendPicker} contentContainerStyle={styles.friendPickerContent}>
              {(chatList?.friends ?? []).length === 0 ? (
                <View style={styles.friendEmpty}>
                  <ThemedText style={styles.friendEmptyText}>Add friends before creating a group.</ThemedText>
                </View>
              ) : null}
              {(chatList?.friends ?? []).map((friend: any) => {
                const isSelected = selectedFriendSlugs.includes(friend.travelerSlug);

                return (
                  <Pressable
                    key={friend.travelerSlug}
                    onPress={() => toggleSelectedFriend(friend.travelerSlug)}
                    style={[styles.friendOption, isSelected ? styles.friendOptionActive : null]}>
                    <WandrAvatar
                      name={friend.name || friend.travelerSlug || 'Traveler'}
                      paletteKey={friend.travelerSlug}
                      size={44}
                      uri={friend.avatarUri}
                      style={styles.friendAvatar}
                    />
                    <View style={styles.friendOptionCopy}>
                      <ThemedText style={styles.friendOptionName} numberOfLines={1}>
                        {friend.name}
                      </ThemedText>
                      <ThemedText style={styles.friendOptionMeta} numberOfLines={1}>
                        {friend.baseLabel}
                      </ThemedText>
                    </View>
                    <View style={[styles.friendCheck, isSelected ? styles.friendCheckActive : null]}>
                      {isSelected ? <Check color={designSystem.colors.darkGreen} size={14} weight="bold" /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
          <View style={styles.sheetSection}>
            <ThemedText style={styles.sheetSectionTitle}>Optional trip</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tripOptionScroller}
              contentContainerStyle={styles.tripOptionRow}>
              <Pressable
                onPress={() => setSelectedTripId(null)}
                style={[styles.tripOption, selectedTripId === null ? styles.tripOptionActive : null]}>
                <ThemedText
                  style={[styles.tripOptionText, selectedTripId === null ? styles.tripOptionTextActive : null]}>
                  No trip
                </ThemedText>
              </Pressable>
              {(trips ?? []).map((trip) => (
                <Pressable
                  key={trip._id}
                  onPress={() => setSelectedTripId(trip._id)}
                  style={[styles.tripOption, selectedTripId === trip._id ? styles.tripOptionActive : null]}>
                  <ThemedText
                    style={[
                      styles.tripOptionText,
                      selectedTripId === trip._id ? styles.tripOptionTextActive : null,
                    ]}
                    numberOfLines={1}>
                    {trip.name}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <Pressable
            accessibilityLabel="Create group"
            onPress={isCreatingGroup || !traveler?.slug ? undefined : handleSubmitCreateGroup}
            style={[
              styles.createButton,
              isCreatingGroup || !traveler?.slug ? styles.createButtonDisabled : null,
            ]}>
            <ThemedText style={styles.createButtonText}>
              {isCreatingGroup
                ? 'Creating...'
                : selectedFriendSlugs.length > 0
                  ? `Create group (${selectedFriendSlugs.length})`
                  : 'Create open group'}
            </ThemedText>
          </Pressable>
        </BottomSheetView>
      </GlassBottomSheet>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: designSystem.spacing.lg,
    gap: designSystem.spacing.xl,
  },
  largeHeaderRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  largeTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  largeTitle: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700',
  },
  largeSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  largeCreateButton: {
    minWidth: 64,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: designSystem.colors.lime,
    paddingHorizontal: 18,
  },
  largeCreateButtonText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    color: designSystem.colors.darkGreen,
  },
  notice: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.copper,
  },
  section: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
  rowList: {
    gap: 18,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: designSystem.layout.cardPadding,
    paddingTop: designSystem.spacing.xl,
    paddingBottom: designSystem.spacing.xl,
    gap: designSystem.spacing.lg,
  },
  sheetHeader: {
    gap: 2,
  },
  sheetTitle: {
    ...designSystem.type.subtitle,
    color: designSystem.colors.ink,
  },
  sheetDescription: {
    ...designSystem.type.bodySmall,
    color: designSystem.colors.gray,
  },
  sheetInput: {
    minHeight: designSystem.layout.inputHeight,
    borderRadius: designSystem.radii.panel,
    backgroundColor: designSystem.colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: designSystem.colors.borderSoft,
    paddingHorizontal: designSystem.spacing.md,
    fontSize: 16,
    lineHeight: 20,
    color: designSystem.colors.ink,
  },
  sheetInputDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
    color: designSystem.colors.darkText,
  },
  sheetSection: {
    gap: designSystem.spacing.sm,
  },
  sheetSectionTitle: {
    ...designSystem.type.label,
    color: designSystem.colors.warmDark,
  },
  friendPicker: {
    maxHeight: 156,
    marginHorizontal: -designSystem.layout.cardPadding,
  },
  friendPickerContent: {
    gap: designSystem.spacing.xs,
    paddingHorizontal: designSystem.layout.cardPadding,
  },
  friendEmpty: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: designSystem.spacing.sm,
    borderRadius: designSystem.radii.panel,
    backgroundColor: designSystem.colors.scrimFaint,
  },
  friendEmptyText: {
    ...designSystem.type.bodySmall,
    color: designSystem.colors.gray,
  },
  friendOption: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing.sm,
    paddingHorizontal: designSystem.spacing.sm,
    paddingVertical: designSystem.spacing.xs,
    borderRadius: designSystem.radii.panel,
    backgroundColor: designSystem.colors.scrimFaint,
  },
  friendOptionActive: {
    backgroundColor: designSystem.colors.limeSoft,
  },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: designSystem.colors.surface,
  },
  friendAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.surface,
  },
  friendAvatarInitial: {
    ...designSystem.type.label,
    color: designSystem.colors.warmDark,
  },
  friendOptionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  friendOptionName: {
    ...designSystem.type.bodySmallStrong,
    color: designSystem.colors.ink,
  },
  friendOptionMeta: {
    ...designSystem.type.caption,
    color: designSystem.colors.gray,
  },
  friendCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: designSystem.colors.borderSoft,
  },
  friendCheckActive: {
    backgroundColor: designSystem.colors.lime,
    borderColor: designSystem.colors.borderAccent,
  },
  tripOptionScroller: {
    marginHorizontal: -designSystem.layout.cardPadding,
  },
  tripOptionRow: {
    gap: designSystem.spacing.xs,
    paddingHorizontal: designSystem.layout.cardPadding,
  },
  tripOption: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: designSystem.spacing.md,
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.scrimFaint,
  },
  tripOptionActive: {
    backgroundColor: designSystem.colors.limeSoft,
  },
  tripOptionText: {
    ...designSystem.type.label,
    color: designSystem.colors.warmDark,
  },
  tripOptionTextActive: {
    color: designSystem.colors.darkGreen,
  },
  createButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: designSystem.colors.lime,
    marginTop: designSystem.spacing.xs,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    ...designSystem.type.bodySmallStrong,
    color: designSystem.colors.darkGreen,
  },
  emptyState: {
    gap: 8,
    paddingTop: 8,
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  emptyDescription: {
    maxWidth: 320,
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.gray,
  },
});
