import { useMutation, useQuery } from 'convex/react';
import * as Contacts from 'expo-contacts';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassInput } from '@/components/ui/glass-input';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { FriendMatchCard } from '@/components/wandr/friends/friend-match-card';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useFriendsBootstrap } from '@/hooks/use-friends-bootstrap';
import { actOnFriendCandidateRef, getFriendDiscoveryRef, matchFriendContactsRef, trackFriendDiscoveryViewRef } from '@/lib/convex';

type DeviceContact = {
  id: string;
  name: string;
  phoneNumber: string;
};

const inviteStoreUrl = Platform.select({
  android: 'https://play.google.com/store/apps/details?id=app.wandr',
  ios: 'https://apps.apple.com/app/wandr/id0000000000',
  default: 'https://wandr.app',
});

function formatFilterLabel(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .split(/(\s+|-|\/)/)
    .map((part) => {
      if (!part || /^\s+$/.test(part) || part === '-' || part === '/') {
        return part;
      }

      return `${part.slice(0, 1).toLocaleUpperCase()}${part.slice(1)}`;
    })
    .join('');
}

function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');
  if (digits.length < 7) {
    return null;
  }

  return `${hasPlus ? '+' : ''}${digits}`;
}

export default function FriendsDiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const traveler = useCurrentTraveler();
  const { isBootstrapping, bootstrapError } = useFriendsBootstrap(traveler?.slug);
  const discovery = useQuery(getFriendDiscoveryRef, { travelerSlug: traveler?.slug ?? '' });
  const actOnCandidate = useMutation(actOnFriendCandidateRef);
  const trackView = useMutation(trackFriendDiscoveryViewRef);
  const [activeVibe, setActiveVibe] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [contactSyncError, setContactSyncError] = useState<string | null>(null);
  const [busyCandidateSlug, setBusyCandidateSlug] = useState<string | null>(null);
  const [hiddenCandidateSlugs, setHiddenCandidateSlugs] = useState<Set<string>>(() => new Set());
  const hasTrackedViewRef = useRef(false);
  const contactSheetRef = useRef<BottomSheet>(null);

  const contactNumbers = useMemo(() => deviceContacts.map((contact) => contact.phoneNumber), [deviceContacts]);
  const contactsByPhoneNumber = useMemo(() => {
    const entries = deviceContacts.map((contact) => [contact.phoneNumber, contact] as const);
    return new Map(entries);
  }, [deviceContacts]);

  const contactMatches = useQuery(
    matchFriendContactsRef,
    traveler?.slug && contactNumbers.length
      ? { travelerSlug: traveler.slug, phoneNumbers: contactNumbers }
      : 'skip'
  );

  const matchedPhoneNumbers = useMemo(() => new Set(contactMatches?.matched.map((match: any) => match.phoneNumber) ?? []), [contactMatches?.matched]);
  const unmatchedContacts = useMemo(() => {
    const unmatchedNumbers = contactMatches?.unmatched ?? [];
    return unmatchedNumbers.map((phoneNumber: string) => contactsByPhoneNumber.get(phoneNumber) ?? {
      id: phoneNumber,
      name: phoneNumber,
      phoneNumber,
    });
  }, [contactMatches?.unmatched, contactsByPhoneNumber]);

  useEffect(() => {
    if (!traveler?.slug || !discovery || hasTrackedViewRef.current) {
      return;
    }

    hasTrackedViewRef.current = true;
    void trackView({ travelerSlug: traveler.slug });
  }, [discovery, trackView, traveler?.slug]);

  const filteredCandidates = useMemo(() => {
    const candidates = discovery?.candidates ?? [];
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return candidates.filter((candidate: any) => {
      if (hiddenCandidateSlugs.has(candidate.travelerSlug)) {
        return false;
      }

      const matchesVibe = activeVibe === 'all' || candidate.vibe === activeVibe;
      const matchesSearch =
        normalizedQuery.length === 0 ||
        [
          candidate.name,
          candidate.baseLabel,
          candidate.destinationLabel,
          candidate.headline,
          ...candidate.interests,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesVibe && matchesSearch;
    });
  }, [activeVibe, discovery?.candidates, hiddenCandidateSlugs, searchQuery]);

  const handleCandidateAction = async (
    candidateSlug: string,
    action: 'invited' | 'passed' | 'friended'
  ) => {
    if (!traveler?.slug) {
      return;
    }

    setBusyCandidateSlug(candidateSlug);
    if (action === 'passed') {
      setHiddenCandidateSlugs((slugs) => {
        const next = new Set(slugs);
        next.add(candidateSlug);
        return next;
      });
    }

    try {
      await actOnCandidate({
        travelerSlug: traveler.slug,
        candidateSlug,
        action,
      });
    } catch (error) {
      if (action === 'passed') {
        setHiddenCandidateSlugs((slugs) => {
          const next = new Set(slugs);
          next.delete(candidateSlug);
          return next;
        });
      }
      throw error;
    } finally {
      setBusyCandidateSlug(null);
    }
  };

  const handleSyncContacts = useCallback(async () => {
    if (Platform.OS === 'web') {
      setContactSyncError('Contact sync is available on iOS and Android.');
      return;
    }

    setIsSyncingContacts(true);
    setContactSyncError(null);

    try {
      const permission = await Contacts.requestPermissionsAsync();
      if (!permission.granted) {
        setContactSyncError('Allow contacts access to find friends already on Wandr.');
        return;
      }

      const result = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });
      const seenPhoneNumbers = new Set<string>();
      const syncedContacts: DeviceContact[] = [];

      for (const contact of result.data) {
        const contactName = contact.name?.trim() || [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() || 'Unnamed contact';

        for (const phone of contact.phoneNumbers ?? []) {
          const phoneNumber = normalizePhoneNumber(phone.number ?? '');
          if (!phoneNumber || seenPhoneNumbers.has(phoneNumber)) {
            continue;
          }

          seenPhoneNumbers.add(phoneNumber);
          syncedContacts.push({
            id: `${contact.id ?? contactName}-${phoneNumber}`,
            name: contactName,
            phoneNumber,
          });
        }
      }

      setDeviceContacts(syncedContacts);
      if (!syncedContacts.length) {
        setContactSyncError('No contacts with phone numbers were found.');
      }
    } catch (error) {
      setContactSyncError(error instanceof Error ? error.message : 'Unable to sync contacts.');
    } finally {
      setIsSyncingContacts(false);
    }
  }, []);

  const handleOpenContacts = () => {
    contactSheetRef.current?.snapToIndex(0);
    if (!deviceContacts.length && !isSyncingContacts) {
      void handleSyncContacts();
    }
  };

  const handleInvitePhone = async (phoneNumber: string, name?: string) => {
    const message = encodeURIComponent(
      `Hey${name ? ` ${name}` : ''}, join me on Wandr so we can plan trips together: ${inviteStoreUrl}`
    );
    const separator = Platform.OS === 'ios' ? '&' : '?';
    await Linking.openURL(`sms:${encodeURIComponent(phoneNumber)}${separator}body=${message}`);
  };

  const isLoading = isBootstrapping || traveler === undefined || discovery === undefined;

  return (
    <ThemedView style={styles.root}>
      <WandrHeader
        config={{
          overlay: true,
          leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
          trailingActions: [
            { kind: 'share', accessibilityLabel: 'Connect contacts', onPress: handleOpenContacts },
          ],
        }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 72,
            paddingBottom: insets.bottom + 120,
          },
        ]}>
        {bootstrapError ? <ThemedText style={styles.notice}>{bootstrapError}</ThemedText> : null}

        <GlassInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={styles.search}
          placeholder="Search by name, city, or destination"
        />

        <SegmentedTabs
          value={activeVibe}
          options={[
            { key: 'all', label: 'All' },
            ...(discovery?.filters.vibes.map((vibe: string) => ({ key: vibe, label: formatFilterLabel(vibe) })) ?? []),
          ]}
          onChange={setActiveVibe}
        />

        <View style={styles.cardStack}>
          {isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <SkeletonBlock key={`discover-match-skeleton-${index}`} style={styles.matchSkeleton} />
              ))
            : filteredCandidates.map((candidate: any) => (
                <FriendMatchCard
                  key={candidate.travelerSlug}
                  candidate={candidate}
                  disabled={busyCandidateSlug === candidate.travelerSlug}
                  onInvite={() => handleCandidateAction(candidate.travelerSlug, 'invited')}
                  onOpenProfile={() => router.push(`/friends/profile/${candidate.travelerSlug}` as never)}
                  onPass={() => handleCandidateAction(candidate.travelerSlug, 'passed')}
                  onFriend={() => handleCandidateAction(candidate.travelerSlug, 'friended')}
                />
              ))}
        </View>

        {!isLoading && filteredCandidates.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyTitle}>No people found</ThemedText>
            <ThemedText style={styles.emptyBody}>
              Clear the search or switch filters to see more travelers.
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>

      <GlassBottomSheet ref={contactSheetRef} index={-1} snapPoints={['72%']} enablePanDownToClose>
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderCopy}>
              <ThemedText style={styles.sheetTitle}>Contacts</ThemedText>
              <ThemedText style={styles.sheetSubtitle}>
                Friends on Wandr show first. Everyone else can be invited by SMS.
              </ThemedText>
            </View>
            <GlassButton
              accessibilityLabel="Sync phone contacts"
              onPress={handleSyncContacts}
              width={92}
              height={36}
              radius={18}
              variant="primary"
              style={isSyncingContacts ? styles.contactActionDisabled : null}>
              <ThemedText style={styles.contactAction}>{isSyncingContacts ? 'Syncing' : 'Sync'}</ThemedText>
            </GlassButton>
          </View>

          {isSyncingContacts ? (
            <View style={styles.syncState}>
              <ActivityIndicator color={designSystem.colors.darkGreen} />
              <ThemedText style={styles.contactMeta}>Checking your phone contacts...</ThemedText>
            </View>
          ) : null}

          {contactSyncError ? <ThemedText style={styles.notice}>{contactSyncError}</ThemedText> : null}

          {contactMatches?.matched.length ? (
            <View style={styles.sheetSection}>
              <ThemedText style={styles.sheetSectionTitle}>Already on Wandr</ThemedText>
              <View style={styles.sheetList}>
                {contactMatches.matched.map((match: any) => (
                  <View key={match.travelerSlug} style={styles.contactRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${match.name}'s Wandr profile`}
                      onPress={() => {
                        contactSheetRef.current?.close();
                        router.push(`/friends/profile/${match.travelerSlug}` as never);
                      }}
                      style={styles.contactCopy}>
                      <ThemedText style={styles.contactName}>{match.name}</ThemedText>
                      <ThemedText style={styles.contactMeta}>
                        {match.baseLabel} - {contactsByPhoneNumber.get(match.phoneNumber)?.phoneNumber ?? match.phoneNumber}
                      </ThemedText>
                    </Pressable>
                    <GlassButton
                      accessibilityLabel={match.isFriend ? `${match.name} already on friends list` : `Send ${match.name} a friend request`}
                      onPress={match.isFriend || busyCandidateSlug === match.travelerSlug ? undefined : () => handleCandidateAction(match.travelerSlug, 'friended')}
                      width={92}
                      height={34}
                      radius={17}
                      variant="primary"
                      style={match.isFriend || busyCandidateSlug === match.travelerSlug ? styles.contactActionDisabled : null}>
                      <ThemedText style={styles.contactAction}>
                        {match.isFriend ? 'Friends' : 'Request'}
                      </ThemedText>
                    </GlassButton>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {unmatchedContacts.length ? (
            <View style={styles.sheetSection}>
              <ThemedText style={styles.sheetSectionTitle}>Invite to app</ThemedText>
              <View style={styles.sheetList}>
                {unmatchedContacts.map((contact: any) => (
                  <View key={contact.id} style={styles.contactRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Invite ${contact.name} to Wandr`}
                      onPress={() => handleInvitePhone(contact.phoneNumber, contact.name)}
                      style={styles.contactCopy}>
                      <ThemedText style={styles.contactName}>{contact.name}</ThemedText>
                      <ThemedText style={styles.contactMeta}>{contact.phoneNumber}</ThemedText>
                    </Pressable>
                    <GlassButton
                      accessibilityLabel={`Invite ${contact.name}`}
                      onPress={() => handleInvitePhone(contact.phoneNumber, contact.name)}
                      width={88}
                      height={34}
                      radius={17}
                      variant="primary">
                      <ThemedText style={styles.contactAction}>Invite</ThemedText>
                    </GlassButton>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {!isSyncingContacts && deviceContacts.length > 0 && contactMatches && !contactMatches.matched.length && !unmatchedContacts.length ? (
            <View style={styles.emptyContacts}>
              <ThemedText style={styles.emptyTitle}>No contacts to show</ThemedText>
              <ThemedText style={styles.emptyBody}>Contacts without valid mobile numbers are skipped.</ThemedText>
            </View>
          ) : null}

          {!isSyncingContacts && deviceContacts.length > 0 && matchedPhoneNumbers.size + unmatchedContacts.length < deviceContacts.length ? (
            <ThemedText style={styles.contactFootnote}>
              {deviceContacts.length - matchedPhoneNumbers.size - unmatchedContacts.length} duplicate or unavailable contact
              {deviceContacts.length - matchedPhoneNumbers.size - unmatchedContacts.length === 1 ? '' : 's'} hidden.
            </ThemedText>
          ) : null}
        </BottomSheetScrollView>
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
    gap: designSystem.spacing.lg,
  },
  notice: {
    ...designSystem.type.cardBody,
    color: designSystem.colors.copper,
  },
  search: {
    height: designSystem.layout.inputHeight,
  },
  cardStack: {
    gap: 2,
  },
  emptyState: {
    gap: 6,
    padding: 18,
    borderRadius: 22,
    backgroundColor: designSystem.colors.surface,
  },
  emptyTitle: {
    ...designSystem.type.cardTitle,
    color: designSystem.colors.ink,
  },
  emptyBody: {
    ...designSystem.type.cardBody,
    color: designSystem.colors.warmDark,
  },
  matchSkeleton: {
    height: 232,
    borderRadius: 28,
  },
  sheetContent: {
    padding: 24,
    paddingBottom: 36,
    gap: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  sheetHeaderCopy: {
    flex: 1,
    gap: 6,
  },
  sheetTitle: {
    ...designSystem.type.title,
  },
  sheetSubtitle: {
    ...designSystem.type.bodySmall,
    color: designSystem.colors.gray,
  },
  syncState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetSection: {
    gap: 10,
  },
  sheetSectionTitle: {
    ...designSystem.type.bodySmallStrong,
    color: designSystem.colors.gray,
  },
  sheetList: {
    gap: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 48,
  },
  contactCopy: {
    flex: 1,
    gap: 2,
  },
  contactName: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.ink,
  },
  contactMeta: {
    flex: 1,
    ...designSystem.type.bodySmall,
    color: designSystem.colors.gray,
  },
  contactAction: {
    ...designSystem.type.bodySmallStrong,
    color: designSystem.colors.darkGreen,
  },
  contactActionDisabled: {
    opacity: 0.55,
  },
  emptyContacts: {
    gap: 6,
    padding: 18,
    borderRadius: 22,
    backgroundColor: designSystem.colors.surface,
  },
  contactFootnote: {
    ...designSystem.type.bodySmall,
    color: designSystem.colors.gray,
  },
});
