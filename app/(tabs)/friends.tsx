import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { ArrowRight } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FriendViewerProfileScreen from '@/app/friends/profile/[travelerSlug]';
import FriendsDiscoverScreen from '@/app/friends/discover';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FriendCircleBanner, FriendCircleBannerSkeleton } from '@/components/wandr/friends/friend-circle-banner';
import { FriendMatchCard, FriendMatchCardSkeleton } from '@/components/wandr/friends/friend-match-card';
import { WandrHeader } from '@/components/wandr/header';
import { LargeScreenPanel, LargeScreenWorkspace } from '@/components/wandr/large-screen-workspace';
import { AppMapWorkspace } from '@/components/wandr/maps/app-map-workspace';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useFriendsBootstrap } from '@/hooks/use-friends-bootstrap';
import { useResponsive } from '@/hooks/use-responsive';
import { actOnFriendCandidateRef, getFriendsDashboardRef } from '@/lib/convex';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { isLargeScreen } = useResponsive();
  const { width: screenWidth } = useWindowDimensions();
  const horizontalGutter = Math.max(designSystem.spacing.lg, insets.left, insets.right);
  const groupCardWidth = Math.min(312, Math.max(260, screenWidth - horizontalGutter * 3));
  const traveler = useCurrentTraveler();
  const { isBootstrapping, bootstrapError } = useFriendsBootstrap(traveler?.slug);
  const dashboard = useQuery(getFriendsDashboardRef, { travelerSlug: traveler?.slug ?? '' });
  const actOnCandidate = useMutation(actOnFriendCandidateRef);
  const [busyCandidateSlug, setBusyCandidateSlug] = useState<string | null>(null);
  const [selectedProfileSlug, setSelectedProfileSlug] = useState<string | null>(null);
  const [mainMode, setMainMode] = useState<'dashboard' | 'discover'>('dashboard');
  const [hiddenCandidateSlugs, setHiddenCandidateSlugs] = useState<Set<string>>(() => new Set());
  const topMatches = useMemo(
    () => dashboard?.topMatches.filter((candidate: any) => !hiddenCandidateSlugs.has(candidate.travelerSlug)) ?? [],
    [dashboard?.topMatches, hiddenCandidateSlugs]
  );

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

  const isLoading = isBootstrapping || traveler === undefined || dashboard === undefined;

  const dashboardContent = (
    <>
      {!isLargeScreen ? (
        <WandrHeader
          config={{
            overlay: true,
            trailingActions: [
              { kind: 'chat', accessibilityLabel: 'Open chats' },
              { kind: 'notifications', accessibilityLabel: 'Notifications' },
            ],
          }}
        />
      ) : null}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: isLargeScreen ? insets.top + 24 : insets.top + 88,
            paddingBottom: insets.bottom + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        {bootstrapError ? <ThemedText style={styles.notice}>{bootstrapError}</ThemedText> : null}

        {isLoading || dashboard?.activeCircles.length ? (
          <View style={styles.groupPreview}>
            <View style={styles.sectionTopRow}>
              <ThemedText style={styles.groupPreviewTitle}>Groups</ThemedText>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.groupRailScroller}
              contentContainerStyle={[
                styles.groupRail,
                {
                  paddingLeft: horizontalGutter,
                  paddingRight: horizontalGutter,
                },
              ]}>
              {isLoading
                ? Array.from({ length: 2 }).map((_, index) => (
                    <FriendCircleBannerSkeleton
                      key={`friend-circle-skeleton-${index}`}
                      style={{ width: groupCardWidth }}
                    />
                  ))
                : dashboard?.activeCircles.map((circle: any) => (
                    <FriendCircleBanner
                      key={circle._id}
                      circle={circle}
                      ctaLabel={`Open ${circle.name}`}
                      onPress={() => router.push(`/friends/group/${circle._id}` as never)}
                      style={{ width: groupCardWidth }}
                    />
                  ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
            <View style={styles.sectionTopRow}>
              <ThemedText style={styles.sectionTitle}>People to meet</ThemedText>
              <Pressable
                onPress={() => {
                  if (isLargeScreen) {
                    setMainMode('discover');
                    return;
                  }
                  router.push('/friends/discover');
                }}
                style={styles.linkPill}
              >
                <ThemedText style={[styles.linkPillText, { color: isDark ? designSystem.colors.lime : designSystem.colors.darkGreen }]}>
                  See all
                </ThemedText>
                <ArrowRight color={isDark ? designSystem.colors.lime : designSystem.colors.darkGreen} size={16} weight="bold" />
              </Pressable>
          </View>
        </View>

        <View style={styles.cardStack}>
          {isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <FriendMatchCardSkeleton key={`friend-match-skeleton-${index}`} />
              ))
            : topMatches.map((candidate: any) => (
                <FriendMatchCard
                  key={candidate.travelerSlug}
                  candidate={candidate}
                  disabled={busyCandidateSlug === candidate.travelerSlug}
                  onInvite={() => handleCandidateAction(candidate.travelerSlug, 'invited')}
                  onOpenProfile={() => {
                    if (isLargeScreen) {
                      setSelectedProfileSlug(candidate.travelerSlug);
                      return;
                    }
                    router.push(`/friends/profile/${candidate.travelerSlug}` as never);
                  }}
                  onPass={() => handleCandidateAction(candidate.travelerSlug, 'passed')}
                  onFriend={() => handleCandidateAction(candidate.travelerSlug, 'friended')}
                />
              ))}
        </View>
      </ScrollView>
    </>
  );
  const mainContent = mainMode === 'discover' && isLargeScreen ? (
    <FriendsDiscoverScreen
      onBack={() => setMainMode('dashboard')}
      onOpenProfile={setSelectedProfileSlug}
      showHeader
    />
  ) : dashboardContent;

  if (isLargeScreen) {
    return (
      <ThemedView style={styles.root}>
        <LargeScreenWorkspace mapContent={<AppMapWorkspace />}>
          <LargeScreenPanel kind="main">
            {mainContent}
          </LargeScreenPanel>
          {selectedProfileSlug ? (
            <LargeScreenPanel kind="detail">
              <FriendViewerProfileScreen
                onClose={() => setSelectedProfileSlug(null)}
                travelerSlug={selectedProfileSlug}
              />
            </LargeScreenPanel>
          ) : null}
        </LargeScreenWorkspace>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.root}>
      {mainContent}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  largeBody: {
    flex: 1,
    flexDirection: 'row',
  },
  mainColumn: {
    flexShrink: 0,
    flexGrow: 0,
    minWidth: 340,
    borderRightWidth: 1,
  },
  mainColumnTablet: {
    width: 360,
  },
  mainColumnDesktop: {
    width: 420,
  },
  detailColumn: {
    flexShrink: 0,
    flexGrow: 0,
    borderRightWidth: 1,
  },
  detailColumnTablet: {
    width: 340,
  },
  detailColumnDesktop: {
    width: 430,
  },
  mapColumn: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    paddingHorizontal: designSystem.spacing.lg,
    gap: designSystem.spacing.lg,
  },
  notice: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.copper,
  },
  groupPreview: {
    gap: designSystem.spacing.sm,
  },
  groupPreviewTitle: {
    flex: 1,
    ...designSystem.type.subtitle,
    color: designSystem.colors.ink,
  },
  groupRail: {
    gap: designSystem.spacing.sm,
  },
  groupRailScroller: {
    marginHorizontal: -designSystem.spacing.lg,
  },
  sectionHeader: {
    gap: 0,
  },
  sectionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    flex: 1,
    ...designSystem.type.title,
    color: designSystem.colors.ink,
  },
  linkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    minHeight: 36,
    minWidth: 120,
  },
  linkPillText: {
    ...designSystem.type.eyebrow,
    color: designSystem.colors.darkGreen,
  },
  cardStack: {
    gap: 14,
  },
});
