import { useMutation, useQuery } from 'convex/react';
import { Link, useRouter } from 'expo-router';
import { ArrowRight, Sparkle } from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FriendCircleBanner } from '@/components/wandr/friends/friend-circle-banner';
import { FriendMatchCard } from '@/components/wandr/friends/friend-match-card';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useFriendsBootstrap } from '@/hooks/use-friends-bootstrap';
import { actOnFriendCandidateRef, getFriendsDashboardRef } from '@/lib/convex';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
            trailingActions: [{ kind: 'notifications', accessibilityLabel: 'Notifications' }],
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
          trailingActions: [{ kind: 'notifications', accessibilityLabel: 'Notifications' }],
        }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 88,
            paddingBottom: insets.bottom + 140,
          },
        ]}>
        <View style={styles.hero}>
          <ThemedText style={styles.eyebrow}>Wandr Social</ThemedText>
          <ThemedText style={styles.title}>Friends</ThemedText>
          <ThemedText style={styles.description}>
            Build a real travel crew around your route, your pace, and the moments you want to chase.
          </ThemedText>
        </View>

        {bootstrapError ? <ThemedText style={styles.notice}>{bootstrapError}</ThemedText> : null}

        {dashboard?.activeCircle ? (
          <FriendCircleBanner circle={dashboard.activeCircle} onPress={() => router.push('/friends/chat')} />
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Sparkle color={designSystem.colors.darkGreen} size={18} weight="fill" />
            <ThemedText style={styles.statValue}>{dashboard?.stats.freshCount ?? 0}</ThemedText>
            <ThemedText style={styles.statLabel}>Fresh matches</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statValue}>{dashboard?.stats.invitedCount ?? 0}</ThemedText>
            <ThemedText style={styles.statLabel}>Invited</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statValue}>{dashboard?.stats.friendCount ?? 0}</ThemedText>
            <ThemedText style={styles.statLabel}>Friend list</ThemedText>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionCopy}>
            <ThemedText style={styles.sectionTitle}>Top matches</ThemedText>
            <ThemedText style={styles.sectionDescription}>
              People already lining up well with your current route.
            </ThemedText>
          </View>
          <Link href="/friends/discover" asChild>
            <Pressable style={styles.linkPill}>
              <ThemedText style={styles.linkPillText}>See all</ThemedText>
              <ArrowRight color={designSystem.colors.darkGreen} size={16} weight="bold" />
            </Pressable>
          </Link>
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
    gap: designSystem.spacing.xl,
  },
  hero: {
    gap: 8,
  },
  eyebrow: {
    ...designSystem.type.eyebrow,
    color: designSystem.colors.darkGreen,
  },
  title: {
    fontSize: 46,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: -1.8,
    textTransform: 'uppercase',
    color: designSystem.colors.ink,
  },
  description: {
    maxWidth: 320,
    fontSize: 16,
    lineHeight: 22,
    color: designSystem.colors.warmDark,
  },
  notice: {
    fontSize: 14,
    lineHeight: 20,
    color: '#a14b1a',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minHeight: 110,
    borderRadius: 26,
    padding: designSystem.spacing.md,
    backgroundColor: 'rgba(255,255,255,0.78)',
    justifyContent: 'space-between',
  },
  statValue: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '800',
    color: designSystem.colors.ink,
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: designSystem.colors.gray,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionCopy: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '800',
    color: designSystem.colors.ink,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.gray,
  },
  linkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: designSystem.radii.pill,
    backgroundColor: 'rgba(159,232,112,0.18)',
  },
  linkPillText: {
    ...designSystem.type.eyebrow,
    color: designSystem.colors.darkGreen,
  },
  cardStack: {
    gap: 14,
  },
});
