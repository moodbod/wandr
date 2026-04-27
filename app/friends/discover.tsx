import { useMutation, useQuery } from 'convex/react';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassInput } from '@/components/ui/glass-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FriendCircleBanner } from '@/components/wandr/friends/friend-circle-banner';
import { FriendMatchCard } from '@/components/wandr/friends/friend-match-card';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useFriendsBootstrap } from '@/hooks/use-friends-bootstrap';
import { actOnFriendCandidateRef, getFriendDiscoveryRef } from '@/lib/convex';

export default function FriendsDiscoverScreen() {
  const insets = useSafeAreaInsets();
  const traveler = useCurrentTraveler();
  const { isBootstrapping, bootstrapError } = useFriendsBootstrap(traveler?.slug);
  const discovery = useQuery(getFriendDiscoveryRef, { travelerSlug: traveler?.slug ?? '' });
  const actOnCandidate = useMutation(actOnFriendCandidateRef);
  const [activeVibe, setActiveVibe] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [busyCandidateSlug, setBusyCandidateSlug] = useState<string | null>(null);

  const filteredCandidates = useMemo(() => {
    const candidates = discovery?.candidates ?? [];
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return candidates.filter((candidate) => {
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
  }, [activeVibe, discovery?.candidates, searchQuery]);

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

  const isLoading = isBootstrapping || traveler === undefined || discovery === undefined;

  if (isLoading) {
    return (
      <ThemedView style={styles.root}>
        <WandrHeader
          config={{
            overlay: true,
            leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
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
          leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
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
          <ThemedText style={styles.eyebrow}>Friends discovery</ThemedText>
          <ThemedText style={styles.title}>Find your people</ThemedText>
          <ThemedText style={styles.description}>
            Match by vibe, route timing, and the kind of trip energy you actually want nearby.
          </ThemedText>
        </View>

        {bootstrapError ? <ThemedText style={styles.notice}>{bootstrapError}</ThemedText> : null}

        {discovery?.activeCircle ? <FriendCircleBanner circle={discovery.activeCircle} ctaLabel="Current circle" /> : null}

        <GlassInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={styles.search}
          placeholder="Search by name, interest, or destination"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Pressable onPress={() => setActiveVibe('all')} style={[styles.filterChip, activeVibe === 'all' ? styles.filterChipActive : null]}>
            <ThemedText style={[styles.filterChipText, activeVibe === 'all' ? styles.filterChipTextActive : null]}>All matches</ThemedText>
          </Pressable>
          {discovery?.filters.vibes.map((vibe) => (
            <Pressable
              key={vibe}
              onPress={() => setActiveVibe(vibe)}
              style={[styles.filterChip, activeVibe === vibe ? styles.filterChipActive : null]}>
              <ThemedText style={[styles.filterChipText, activeVibe === vibe ? styles.filterChipTextActive : null]}>
                {vibe}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.banner}>
          <ThemedText style={styles.bannerEyebrow}>Fresh compatibility</ThemedText>
          <ThemedText style={styles.bannerTitle}>
            {filteredCandidates.filter((candidate) => candidate.actionState === null).length} travelers line up with your current route.
          </ThemedText>
        </View>

        <View style={styles.cardStack}>
          {filteredCandidates.map((candidate) => (
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
    gap: 8,
  },
  eyebrow: {
    ...designSystem.type.eyebrow,
    color: designSystem.colors.darkGreen,
  },
  title: {
    fontSize: 42,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -1.5,
    textTransform: 'uppercase',
    color: designSystem.colors.ink,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    color: designSystem.colors.warmDark,
    maxWidth: 320,
  },
  notice: {
    fontSize: 14,
    lineHeight: 20,
    color: '#a14b1a',
  },
  search: {
    minHeight: 54,
  },
  filterRow: {
    gap: 10,
    paddingRight: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: designSystem.radii.pill,
    backgroundColor: 'rgba(14,15,12,0.06)',
  },
  filterChipActive: {
    backgroundColor: designSystem.colors.lime,
  },
  filterChipText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '800',
    color: designSystem.colors.warmDark,
    textTransform: 'uppercase',
  },
  filterChipTextActive: {
    color: designSystem.colors.darkGreen,
  },
  banner: {
    gap: 6,
    borderRadius: 28,
    padding: designSystem.spacing.xl,
    backgroundColor: 'rgba(159,232,112,0.18)',
  },
  bannerEyebrow: {
    ...designSystem.type.eyebrow,
    color: designSystem.colors.darkGreen,
  },
  bannerTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    color: designSystem.colors.darkGreen,
  },
  cardStack: {
    gap: 14,
  },
});
