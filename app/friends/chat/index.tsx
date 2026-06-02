import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, FadersHorizontal, MagnifyingGlass } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Input } from '@/components/ui/input';
import { Sheet, SheetTextInput, SheetView, SheetRef } from '@/components/ui/sheet';
import { SegmentedTabs, SegmentedTabsAccessory } from '@/components/ui/segmented-tabs';
import { WandrAvatar } from '@/components/wandr/avatar';
import DirectChatScreen from '@/components/wandr/friends/direct-chat-screen';
import { FriendChatListRow } from '@/components/wandr/friends/friend-chat-list-row';
import FriendViewerProfileScreen from '@/components/wandr/friends/friend-viewer-profile-screen';
import { styles } from '@/components/wandr/friends/friends-chat-list-screen.styles';
import FriendsChatScreen from '@/components/wandr/friends/group-chat-screen';
import SupportChatScreen from '@/components/wandr/friends/support-chat-screen';
import { WandrHeader } from '@/components/wandr/header';
import { LargeScreenPanel, LargeScreenWorkspace } from '@/components/wandr/large-screen-workspace';
import { AppMapWorkspace } from '@/components/wandr/maps/app-map-workspace';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useFriendsBootstrap } from '@/hooks/use-friends-bootstrap';
import { useResponsive } from '@/hooks/use-responsive';
import { createOpenFriendGroupRef, getFriendChatListRef, getSupportChatListRef, joinFriendCircleRef, listUserTripsRef } from '@/lib/convex';
import type { FriendChatListItem, JoinableFriendGroup } from '@/types/friends';

type ChatFilter = 'primary' | 'groups' | 'chats';
type ChatDetail =
  | { kind: 'direct'; id: string }
  | { kind: 'group'; id: string }
  | { kind: 'profile'; slug: string }
  | { kind: 'support'; id?: string };

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
    supportThreadId?: string | string[];
  }>();
  const isDark = useColorScheme() === 'dark';
  const { isLargeScreen } = useResponsive();
  const traveler = useCurrentTraveler();
  const { bootstrapError } = useFriendsBootstrap(traveler?.slug);
  const chatList = useQuery(getFriendChatListRef, traveler?.slug ? { travelerSlug: traveler.slug } : 'skip');
  const supportList = useQuery(getSupportChatListRef, traveler?.slug ? { travelerSlug: traveler.slug } : 'skip');
  const trips = useQuery(listUserTripsRef, traveler?.slug ? { travelerSlug: traveler.slug } : 'skip');
  const createGroup = useMutation(createOpenFriendGroupRef);
  const joinGroup = useMutation(joinFriendCircleRef);
  const sheetRef = useRef<SheetRef>(null);
  const [groupName, setGroupName] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedFriendSlugs, setSelectedFriendSlugs] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [joiningCircleId, setJoiningCircleId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ChatFilter>('primary');
  const [searchQuery, setSearchQuery] = useState('');
  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const directThreadId = Array.isArray(params.directThreadId) ? params.directThreadId[0] : params.directThreadId;
  const groupCircleId = Array.isArray(params.groupCircleId) ? params.groupCircleId[0] : params.groupCircleId;
  const supportThreadId = Array.isArray(params.supportThreadId) ? params.supportThreadId[0] : params.supportThreadId;

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
  const filteredSupportRows = useMemo(() => {
    const rows = supportList?.ownThread ? [supportList.ownThread] : [];
    if (!normalizedSearchQuery) {
      return rows;
    }

    return rows.filter((item) =>
      [item.title, item.subtitle, item.preview ?? ''].some((value) =>
        value.toLowerCase().includes(normalizedSearchQuery)
      )
    );
  }, [normalizedSearchQuery, supportList?.ownThread]);
  const filteredSupportInboxRows = useMemo(() => {
    const ownThreadId = supportList?.ownThread.threadId ? String(supportList.ownThread.threadId) : null;
    const rows = (supportList?.adminThreads ?? []).filter((item) => String(item.threadId) !== ownThreadId);
    if (!normalizedSearchQuery) {
      return rows;
    }

    return rows.filter((item) =>
      [item.title, item.subtitle, item.preview ?? ''].some((value) =>
        value.toLowerCase().includes(normalizedSearchQuery)
      )
    );
  }, [normalizedSearchQuery, supportList?.adminThreads, supportList?.ownThread.threadId]);
  const showGroups = activeFilter === 'primary' || activeFilter === 'groups';
  const showDirects = activeFilter === 'primary' || activeFilter === 'chats';
  const showSupport = activeFilter === 'primary' || activeFilter === 'chats';

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
      return;
    }

    if (supportThreadId) {
      setDetail((current) =>
        current?.kind === 'support' && current.id === supportThreadId
          ? current
          : { kind: 'support', id: supportThreadId }
      );
    }
  }, [directThreadId, groupCircleId, isLargeScreen, supportThreadId]);

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

  const openGroup = (circleId: string) => {
    if (isLargeScreen) {
      setDetail({ kind: 'group', id: circleId });
      return;
    }

    router.push(`/friends/group/${circleId}` as never);
  };

  const openSupport = (threadId?: string | null) => {
    if (isLargeScreen) {
      setDetail(threadId ? { kind: 'support', id: threadId } : { kind: 'support' });
      return;
    }

    router.push((threadId ? `/friends/support/${threadId}` : '/friends/support') as never);
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
        openGroup(String(circleId));
      }
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleJoinOpenGroup = async (item: JoinableFriendGroup) => {
    if (!traveler?.slug || joiningCircleId) {
      return;
    }

    const circleId = String(item.id);
    setJoiningCircleId(circleId);
    try {
      const joined = await joinGroup({
        travelerSlug: traveler.slug,
        circleId: item.id,
      });
      if (joined) {
        openGroup(circleId);
      }
    } finally {
      setJoiningCircleId(null);
    }
  };

  const openChatItem = (item: { href?: string }) => {
    const href = item.href ?? '';
    const groupId = href.match(/\/friends\/group\/([^/?#]+)/)?.[1];
    const directId = href.match(/\/friends\/direct\/([^/?#]+)/)?.[1];
    const supportId = href.match(/\/friends\/support\/([^/?#]+)/)?.[1];
    const isSupportHref = href === '/friends/support' || Boolean(supportId);

    if (isLargeScreen) {
      if (isSupportHref) {
        openSupport(supportId ? decodeURIComponent(supportId) : null);
        return;
      }

      if (groupId) {
        openGroup(decodeURIComponent(groupId));
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

        <Input
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={
            <MagnifyingGlass
              color={isDark ? designSystem.colors.darkPlaceholderText : designSystem.colors.placeholderText}
              size={18}
              weight="regular"
            />
          }
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

        {showSupport && filteredSupportRows.length ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Support</ThemedText>
            <View style={styles.rowList}>
              {filteredSupportRows.map((item: FriendChatListItem) => (
                <FriendChatListRow key={item.id} item={item} onPress={() => openChatItem(item)} />
              ))}
            </View>
          </View>
        ) : null}

        {showSupport && filteredSupportInboxRows.length ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Support inbox</ThemedText>
            <View style={styles.rowList}>
              {filteredSupportInboxRows.map((item: FriendChatListItem) => (
                <FriendChatListRow key={item.id} item={item} onPress={() => openChatItem(item)} />
              ))}
            </View>
          </View>
        ) : null}

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
                <FriendChatListRow
                  key={item.id}
                  item={
                    joiningCircleId === String(item.id)
                      ? { ...item, preview: 'Joining group...' }
                      : item
                  }
                  onPress={() => handleJoinOpenGroup(item)}
                />
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

        {(showSupport ? filteredSupportRows.length + filteredSupportInboxRows.length : 0) +
          (showGroups ? filteredGroups.length + filteredJoinableGroups.length : 0) +
          (showDirects ? filteredDirects.length : 0) === 0 ? (
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
  ) : detail?.kind === 'support' ? (
    <SupportChatScreen embedded onClose={() => setDetail(null)} threadId={detail.id} />
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

      <Sheet ref={sheetRef} index={-1} snapPoints={['68%']} enablePanDownToClose>
        <SheetView style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <ThemedText style={styles.sheetTitle}>Create group</ThemedText>
            <ThemedText style={styles.sheetDescription}>Invite friends now or start an open group.</ThemedText>
          </View>
          <SheetTextInput
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
        </SheetView>
      </Sheet>
    </ThemedView>
  );
}
