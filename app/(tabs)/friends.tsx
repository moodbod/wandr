import { useMutation, useQuery } from 'convex/react';
import { Link, useRouter } from 'expo-router';
import { ArrowRight } from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
  const screenWidth = Dimensions.get('window').width;
  const horizontalGutter = Math.max(designSystem.spacing.lg, insets.left, insets.right);
  const groupCardWidth = Math.max(260, screenWidth - horizontalGutter * 2);
  const traveler = useCurrentTraveler();
  const { isBootstrapping, bootstrapError } = useFriendsBootstrap(traveler?.slug);
  const dashboard = useQuery(getFriendsDashboardRef, { travelerSlug: traveler?.slug ?? '' });
  const actOnCandidate = useMutation(actOnFriendCandidateRef);
  const [busyCandidateSlug, setBusyCandidateSlug] = useState<string | null>(null);

  const handleCandidateAction = async (
    candidateSlug: string,
    action: 'invited' | 'passed' | 'friended'
  ) => {
    if (!traveler?.slug) {
      return;
    }

    setBusyCandidateSlug(candidateSlug);
    try {
      await actOnCandidate({
        travelerSlug: traveler.slug,
        candidateSlug,
        action,
      });
    } finally {
      setBusyCandidateSlug(null);
    }
  };

  const isLoading = isBootstrapping || traveler === undefined || dashboard === undefined;

  if (isLoading) {
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
        <View style={[styles.loadingWrap, { paddingTop: insets.top + 96 }]}>
          <ActivityIndicator size="large" />
        </View>
      </ThemedView>
    );
  }

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

        {dashboard?.activeCircles.length ? (
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
              {dashboard.activeCircles.map((circle) => (
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
          {dashboard?.topMatches.map((candidate) => (
            <FriendMatchCard
              key={candidate.travelerSlug}
              candidate={candidate}
              disabled={busyCandidateSlug === candidate.travelerSlug}
              onInvite={() => handleCandidateAction(candidate.travelerSlug, 'invited')}
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
