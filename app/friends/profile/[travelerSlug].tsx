import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChatCircleDots, MapPin, UserCheck, UserPlus } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassButton } from '@/components/ui/glass-button';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { FaceHashAvatar } from '@/components/wandr/facehash-avatar';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import {
  actOnFriendCandidateRef,
  getFriendViewerProfileRef,
} from '@/lib/convex';
import type { FriendViewerProfile } from '@/types/friends';

type RelationshipState = NonNullable<FriendViewerProfile>['relationship']['state'];

export default function FriendViewerProfileScreen({
  onClose,
  travelerSlug: travelerSlugProp,
}: {
  onClose?: () => void;
  travelerSlug?: string;
} = {}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? designSystem.semantic.dark : designSystem.semantic.light;
  const params = useLocalSearchParams<{ travelerSlug?: string | string[] }>();
  const profileSlug = travelerSlugProp ?? (Array.isArray(params.travelerSlug) ? params.travelerSlug[0] : params.travelerSlug);
  const traveler = useCurrentTraveler();
  const profile = useQuery(
    getFriendViewerProfileRef,
    traveler?.slug && profileSlug ? { travelerSlug: traveler.slug, profileSlug } : 'skip'
  );
  const actOnCandidate = useMutation(actOnFriendCandidateRef);
  const [isActing, setIsActing] = useState(false);

  const isLoading = traveler === undefined || profile === undefined;

  const handleFriend = async () => {
    if (!traveler?.slug || !profileSlug || isActing) {
      return;
    }

    setIsActing(true);
    try {
      await actOnCandidate({
        travelerSlug: traveler.slug,
        candidateSlug: profileSlug,
        action: 'friended',
      });
    } finally {
      setIsActing(false);
    }
  };

  return (
    <ThemedView style={styles.root}>
      <WandrHeader
        config={{
          overlay: true,
          leadingAction: onClose
            ? { kind: 'back', accessibilityLabel: 'Close profile', onPress: onClose }
            : { kind: 'back', accessibilityLabel: 'Go back' },
        }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 88,
            paddingBottom: insets.bottom + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ProfileSkeleton />
        ) : profile ? (
          <>
            <ViewerHero
              friendCount={profile.stats.friendCount}
              profile={profile}
            />

            <View style={styles.actionRow}>
              <RelationshipButton
                isActing={isActing}
                name={profile.traveler.name}
                onFriend={handleFriend}
                relationshipState={profile.relationship.state}
              />
              <Pressable
                accessibilityLabel={`Message ${profile.traveler.name}`}
                disabled={!profile.relationship.directThreadId}
                onPress={() => {
                  if (profile.relationship.directThreadId) {
                    router.push(`/friends/direct/${profile.relationship.directThreadId}` as never);
                  }
                }}
                style={[
                  styles.messageButton,
                  { backgroundColor: colors.surface },
                  !profile.relationship.directThreadId ? styles.disabledAction : null,
                ]}>
                <ChatCircleDots color={designSystem.colors.ink} size={18} weight="bold" />
                <ThemedText style={styles.messageButtonText}>Message</ThemedText>
              </Pressable>
            </View>

            {profile.profile ? (
              <View style={[styles.travelCard, { backgroundColor: colors.surface }]}>
                <View style={styles.travelCardHeader}>
                  <MapPin color={designSystem.colors.darkGreen} size={18} weight="fill" />
                  <ThemedText style={styles.travelCardTitle}>{profile.profile.destinationLabel}</ThemedText>
                </View>
                {profile.profile.headline ? (
                  <ThemedText style={styles.headline}>{profile.profile.headline}</ThemedText>
                ) : null}
                <ThemedText style={styles.bio}>{profile.profile.bio}</ThemedText>
                <View style={styles.metaRow}>
                  <MetaPill label={formatVibe(profile.profile.vibe)} />
                  <MetaPill label={`${formatPace(profile.profile.travelPace)} pace`} />
                  <MetaPill label={profile.profile.arrivalWindowLabel} />
                </View>
              </View>
            ) : null}

            <InterestSection
              interests={profile.profile?.interests ?? []}
              sharedInterests={profile.profile?.sharedInterests ?? []}
            />
          </>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <ThemedText style={styles.emptyTitle}>Profile unavailable</ThemedText>
            <ThemedText style={styles.emptyBody}>This traveler profile could not be found.</ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function ViewerHero({
  friendCount,
  profile,
}: {
  friendCount: number;
  profile: NonNullable<FriendViewerProfile>;
}) {
  const avatarUri = profile.traveler.avatarUri ?? null;
  const matchScore = profile.profile?.matchScore ?? 0;
  const sharedCount = profile.profile?.sharedInterests.length ?? 0;

  return (
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <FaceHashAvatar
          name={profile.traveler.name || profile.traveler.slug || 'Traveler'}
          paletteKey={profile.traveler.slug}
          size={92}
          uri={avatarUri}
          style={styles.heroAvatar}
        />
        <View style={styles.heroBody}>
          <ThemedText adjustsFontSizeToFit numberOfLines={1} style={styles.name}>
            {profile.traveler.name}
          </ThemedText>
          <ThemedText numberOfLines={1} style={styles.location}>
            {profile.traveler.baseLabel}
          </ThemedText>
          {profile.profile?.destinationLabel ? (
            <ThemedText numberOfLines={1} style={styles.destination}>
              {profile.profile.destinationLabel}
            </ThemedText>
          ) : null}
        </View>
      </View>
      <View style={styles.statsRow}>
        <Stat label="Match" value={matchScore ? `${matchScore}%` : '-'} />
        <Stat label="Shared" value={sharedCount} />
        <Stat label="Friends" value={friendCount} />
      </View>
    </View>
  );
}

function RelationshipButton({
  isActing,
  name,
  onFriend,
  relationshipState,
}: {
  isActing: boolean;
  name: string;
  onFriend: () => void;
  relationshipState: RelationshipState;
}) {
  const isDisabled = relationshipState === 'self' || relationshipState === 'friend' || relationshipState === 'invited' || isActing;
  const label =
    relationshipState === 'self'
      ? 'Your profile'
        : relationshipState === 'friend'
          ? 'Friend'
        : relationshipState === 'invited'
          ? 'Requested'
          : 'Add friend';
  const isConfirmed = relationshipState === 'friend' || relationshipState === 'self';
  const Icon = isConfirmed ? UserCheck : UserPlus;

  return (
    <GlassButton
      accessibilityLabel={relationshipState === 'available' ? `Add ${name} as a friend` : `${name} is ${label.toLowerCase()}`}
      height={44}
      onPress={isDisabled ? undefined : onFriend}
      radius={18}
      style={isActing ? styles.disabledAction : null}
      variant="primary"
      width={148}>
      <View style={styles.primaryButtonContent}>
        <Icon color={designSystem.colors.darkGreen} size={17} weight="bold" />
        <ThemedText style={styles.primaryButtonText}>{label}</ThemedText>
      </View>
    </GlassButton>
  );
}

function InterestSection({ interests, sharedInterests }: { interests: string[]; sharedInterests: string[] }) {
  const visibleInterests = interests.slice(0, 8);

  if (visibleInterests.length === 0) {
    return null;
  }

  return (
    <View style={styles.interestSection}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>Trip style</ThemedText>
        {sharedInterests.length > 0 ? (
          <ThemedText style={styles.sectionSubtitle}>{sharedInterests.length} shared interests</ThemedText>
        ) : null}
      </View>
      <View style={styles.chipWrap}>
        {visibleInterests.map((interest) => {
          const isShared = sharedInterests.includes(interest);
          return (
            <View key={interest} style={[styles.chip, isShared ? styles.sharedChip : null]}>
              <ThemedText style={[styles.chipText, isShared ? styles.sharedChipText : null]}>{interest}</ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.stat}>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <View style={styles.metaPill}>
      <ThemedText numberOfLines={1} style={styles.metaPillText}>
        {label}
      </ThemedText>
    </View>
  );
}

function ProfileSkeleton() {
  return (
    <View style={styles.skeletonStack}>
      <SkeletonBlock style={styles.heroSkeleton} />
      <SkeletonBlock style={styles.actionSkeleton} />
      <SkeletonBlock style={styles.cardSkeleton} />
      <SkeletonBlock style={styles.cardSkeletonSmall} />
    </View>
  );
}

function formatVibe(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function formatPace(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: designSystem.spacing.lg,
    gap: designSystem.spacing.lg,
  },
  hero: {
    gap: 16,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: designSystem.colors.surface,
  },
  heroBody: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  name: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  location: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.subtleText,
  },
  destination: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  headline: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.warmDark,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 64,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: designSystem.colors.scrimFaint,
  },
  statValue: {
    fontSize: 21,
    lineHeight: 24,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  statLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  disabledAction: {
    opacity: 0.55,
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minWidth: 128,
  },
  primaryButtonText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  messageButton: {
    height: 44,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 18,
  },
  messageButtonText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  travelCard: {
    gap: 12,
    padding: 18,
    borderRadius: 24,
  },
  travelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  travelCardTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: 15,
    backgroundColor: designSystem.colors.scrimFaint,
  },
  metaPillText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  interestSection: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: designSystem.colors.scrimFaint,
  },
  sharedChip: {
    backgroundColor: designSystem.colors.lime,
  },
  chipText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  sharedChipText: {
    color: designSystem.colors.darkGreen,
  },
  emptyState: {
    gap: 6,
    padding: 18,
    borderRadius: 22,
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.warmDark,
  },
  skeletonStack: {
    gap: designSystem.spacing.lg,
  },
  heroSkeleton: {
    height: 148,
    borderRadius: 28,
  },
  actionSkeleton: {
    height: 44,
    borderRadius: 18,
  },
  cardSkeleton: {
    height: 148,
    borderRadius: 24,
  },
  cardSkeletonSmall: {
    height: 96,
    borderRadius: 24,
  },
});
