import { useMutation, useQuery } from 'convex/react';
import { Link, useRouter } from 'expo-router';
import { ArrowRight } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SkeletonBlock } from '@/components/ui/skeleton-block';
import { FriendCircleBanner } from '@/components/wandr/friends/friend-circle-banner';
import { FriendMatchCard } from '@/components/wandr/friends/friend-match-card';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useFriendsBootstrap } from '@/hooks/use-friends-bootstrap';
import { actOnFriendCandidateRef, getFriendsDashboardRef } from '@/lib/convex';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { width: screenWidth } = useWindowDimensions();
  const horizontalGutter = Math.max(designSystem.spacing.lg, insets.left, insets.right);
  const groupCardWidth = Math.min(312, Math.max(260, screenWidth - horizontalGutter * 3));
  const traveler = useCurrentTraveler();
  const { isBootstrapping, bootstrapError } = useFriendsBootstrap(traveler?.slug);
  const dashboard = useQuery(getFriendsDashboardRef, { travelerSlug: traveler?.slug ?? '' });
  const actOnCandidate = useMutation(actOnFriendCandidateRef);
  const [busyCandidateSlug, setBusyCandidateSlug] = useState<string | null>(null);
  const [hiddenCandidateSlugs, setHiddenCandidateSlugs] = useState<Set<string>>(() => new Set());
  const topMatches = useMemo(
    () => dashboard?.topMatches.filter((candidate) => !hiddenCandidateSlugs.has(candidate.travelerSlug)) ?? [],
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

  return (
    <ThemedView style={styles.root}>
      <WandrHeader
        config={{
          overlay: true,
          trailingActions: [
            { kind: 'chat', accessibilityLabel: 'Open chats' },
            { kind: 'notifications', accessibilityLabel: 'Notifications' },
          ],
        }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 88,
            paddingBottom: insets.bottom + 120,
          },
        ]}>
        <View style={styles.hero}>
          <ThemedText style={styles.title}>Friends</ThemedText>
        </View>

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
                    <SkeletonBlock key={`friend-circle-skeleton-${index}`} style={[styles.circleSkeleton, { width: groupCardWidth }]} />
                  ))
                : dashboard?.activeCircles.map((circle) => (
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
            <Link href="/friends/discover" asChild>
              <Pressable style={styles.linkPill}>
                <ThemedText style={[styles.linkPillText, { color: isDark ? designSystem.colors.lime : designSystem.colors.darkGreen }]}>
                  See all
                </ThemedText>
                <ArrowRight color={isDark ? designSystem.colors.lime : designSystem.colors.darkGreen} size={16} weight="bold" />
              </Pressable>
            </Link>
          </View>
        </View>

        <View style={styles.cardStack}>
          {isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <SkeletonBlock key={`friend-match-skeleton-${index}`} style={styles.matchSkeleton} />
              ))
            : topMatches.map((candidate) => (
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
      </ScrollView>
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
  hero: {
    gap: 2,
  },
  title: {
    ...designSystem.type.display,
    fontWeight: '600',
    color: designSystem.colors.ink,
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
  circleSkeleton: {
    height: 152,
    borderRadius: 28,
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
  matchSkeleton: {
    height: 232,
    borderRadius: 28,
  },
});
