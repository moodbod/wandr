import { useQuery } from 'convex/react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExploreHiddenGemCardSkeleton } from '@/components/wandr/explore/card-skeletons';
import { ExploreHiddenGemCard } from '@/components/wandr/explore/hidden-gem-card';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import type { ExploreHiddenGem } from '@/constants/explore-content';
import { getHiddenGemSlug } from '@/constants/hidden-gems-content';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { getExplorePageContentRef } from '@/lib/convex';

const hiddenGemMeta: Record<string, { district: string; moment: string; note: string }> = {
  'The Red Lighthouse': {
    district: 'Jetty edge',
    moment: 'Sunset stop',
    note: 'A scenic pause when you want salt air, slower pacing, and an easy photo payoff.',
  },
  'Pink Salt Pans': {
    district: 'Outside town',
    moment: 'Early outing',
    note: 'Feels a little surreal and works best when you want a quick escape before the main day starts.',
  },
  'Art Alleyway': {
    district: 'Town center',
    moment: 'Late afternoon',
    note: 'Best folded into a walking loop with coffee, small shopping, or a casual meal nearby.',
  },
};

export default function ExploreHiddenGemsScreen() {
  return <ConnectedExploreHiddenGemsScreen />;
}

function ConnectedExploreHiddenGemsScreen() {
  const insets = useSafeAreaInsets();
  const traveler = useCurrentTraveler();
  const page = useQuery(getExplorePageContentRef, { slug: 'default', travelerSlug: traveler?.slug });

  return (
    <ExploreHiddenGemsScreenView
      insetsTop={insets.top}
      isLoading={!page}
      notice={null}
      page={page}
    />
  );
}

function ExploreHiddenGemsScreenView({
  insetsTop,
  isLoading,
  notice,
  page,
}: {
  insetsTop: number;
  isLoading: boolean;
  notice: string | null;
  page: any | null | undefined;
}) {
  const items = page?.search.hiddenGems.items ?? [];
  const leadGem = items[0];
  const groupedGems = isLoading ? buildLoadingGemGroups() : buildGemGroups(items);

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
          { paddingTop: insetsTop + 72, paddingBottom: designSystem.spacing.xxxl * 2 },
        ]}>
        {isLoading || leadGem ? (
          <ThemedView lightColor={designSystem.colors.surface} darkColor={designSystem.colors.darkSurface} style={styles.leadCard}>
            {leadGem ? (
              <View style={styles.leadHeader}>
                <View style={styles.leadCopy}>
                  <ThemedText style={styles.leadTitle}>{leadGem.title}</ThemedText>
                  <ThemedText style={styles.leadDescription}>{getGemMeta(leadGem).note}</ThemedText>
                </View>
                <View style={styles.statGrid}>
                  <GemStat label="Pocket" value={getGemMeta(leadGem).district} />
                  <GemStat label="Best for" value={getGemMeta(leadGem).moment} />
                </View>
              </View>
            ) : null}
            {isLoading ? (
              <ExploreHiddenGemCardSkeleton />
            ) : (
              <ExploreHiddenGemCard
                card={leadGem}
                href={{ pathname: '/explore/hidden-gems/[slug]', params: { slug: getHiddenGemSlug(leadGem.title) } }}
              />
            )}
          </ThemedView>
        ) : null}

        <View style={styles.quickStrip}>
          {groupedGems.map((group) => (
            <ThemedView
              key={group.title}
              lightColor={designSystem.colors.surface}
              darkColor={designSystem.colors.darkSurface}
              style={styles.quickCard}>
              <ThemedText style={styles.quickValue}>{group.title}</ThemedText>
              <ThemedText style={styles.quickDescription}>{group.description}</ThemedText>
            </ThemedView>
          ))}
        </View>

        {groupedGems.map((group) => (
          <View key={group.title} style={styles.section}>
            <View style={styles.sectionHeading}>
              <ThemedText style={styles.sectionTitle}>{group.title}</ThemedText>
              <ThemedText style={styles.sectionDescription}>{group.description}</ThemedText>
            </View>
            <View style={styles.grid}>
              {isLoading
                ? Array.from({ length: group.items.length || 1 }).map((_, index) => (
                    <View key={`${group.key}-skeleton-${index}`} style={styles.groupedCard}>
                      <ExploreHiddenGemCardSkeleton />
                    </View>
                  ))
                : group.items.map((item) => (
                    <View key={item.title} style={styles.groupedCard}>
                      <ExploreHiddenGemCard
                        card={item}
                        href={{ pathname: '/explore/hidden-gems/[slug]', params: { slug: getHiddenGemSlug(item.title) } }}
                      />
                      <View style={styles.noteRow}>
                        <GemTag label={getGemMeta(item).district} />
                        <GemTag label={getGemMeta(item).moment} />
                      </View>
                    </View>
                  ))}
            </View>
          </View>
        ))}

        <Link href="/explore/search" asChild>
          <Pressable style={styles.cta}>
            <ThemedText style={styles.ctaLabel}>Back to discovery results</ThemedText>
          </Pressable>
        </Link>
      </ScrollView>
    </ThemedView>
  );
}

function GemStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
    </View>
  );
}

function GemTag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <ThemedText style={styles.tagLabel}>{label}</ThemedText>
    </View>
  );
}

function getGemMeta(item: ExploreHiddenGem) {
  return (
    hiddenGemMeta[item.title] ?? {
      district: 'Swakopmund',
      moment: 'Open window',
      note: item.description,
    }
  );
}

function buildGemGroups(items: readonly ExploreHiddenGem[]) {
  const groups = [
    {
      key: 'coastal',
      title: 'Coastal detours',
      eyebrow: 'Airy and scenic',
      description: 'When the day needs space, sea air, and somewhere to slow down for a minute.',
      matcher: (item: ExploreHiddenGem) => item.title === 'The Red Lighthouse',
    },
    {
      key: 'offbeat',
      title: 'Off-grid moments',
      eyebrow: 'A little stranger',
      description: 'Small excursions that feel more like discoveries than checklist stops.',
      matcher: (item: ExploreHiddenGem) => item.title === 'Pink Salt Pans',
    },
    {
      key: 'urban',
      title: 'Town details',
      eyebrow: 'Close to the center',
      description: 'Quieter corners you can stack with coffee, shops, or an easy walk.',
      matcher: (item: ExploreHiddenGem) => item.title === 'Art Alleyway',
    },
  ];

  return groups
    .map((group) => ({
      ...group,
      items: items.filter(group.matcher),
    }))
    .filter((group) => group.items.length > 0);
}

function buildLoadingGemGroups() {
  return [
    {
      key: 'loading-coastal',
      title: 'Coastal detours',
      eyebrow: 'Airy and scenic',
      description: 'When the day needs space, sea air, and somewhere to slow down for a minute.',
      items: [],
    },
    {
      key: 'loading-offbeat',
      title: 'Off-grid moments',
      eyebrow: 'A little stranger',
      description: 'Small excursions that feel more like discoveries than checklist stops.',
      items: [],
    },
  ];
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: designSystem.spacing.lg,
    gap: designSystem.spacing.xxl,
  },
  noticeCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: designSystem.colors.limeSoft,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  leadCard: {
    borderRadius: 30,
    padding: 18,
    gap: 18,
    borderWidth: 1,
    borderColor: designSystem.colors.limeSoft,
  },
  leadHeader: {
    gap: 16,
  },
  leadCopy: {
    gap: 8,
  },
  leadTitle: {
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '600',
  },
  leadDescription: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    minWidth: 120,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: designSystem.colors.limeSoft,
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  statValue: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '600',
  },
  quickStrip: {
    gap: 12,
  },
  quickCard: {
    borderRadius: 24,
    padding: 18,
    gap: 6,
    borderWidth: 1,
    borderColor: designSystem.colors.limeSoft,
  },
  quickValue: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '600',
  },
  quickDescription: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  section: {
    gap: 16,
  },
  sectionHeading: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '600',
  },
  sectionDescription: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  grid: {
    gap: 18,
  },
  groupedCard: {
    gap: 12,
  },
  noteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    borderRadius: designSystem.radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: designSystem.colors.limeSoft,
  },
  tagLabel: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '600',
  },
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.lime,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  ctaLabel: {
    fontSize: 13,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
});
