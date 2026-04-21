import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WandrHeader } from '@/components/wandr/header';
import { LiveLocationCard } from '@/components/wandr/trip/live-location-card';
import {
  TripActionSkeletons,
  TripBentoSkeletons,
  TripHeroSkeleton,
  TripTimelineSkeleton,
} from '@/components/wandr/trip/trip-skeletons';
import { TripTimelineSection } from '@/components/wandr/trip/trip-timeline-section';
import { WeatherCard } from '@/components/wandr/trip/weather-card';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { getTripDashboardRef } from '@/lib/convex';
import { currentDemoTravelerSlug } from '@/lib/demo-session';
import { buildTripMapMarkers } from '@/lib/explore-map-markers';
import type { TripDashboard } from '@/types/trip';
import { useQuery } from 'convex/react';
import { Link, useRouter } from 'expo-router';
import { NavigationArrow, ShareNetwork } from 'phosphor-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TripScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { coordinate: currentLocation, heading: currentHeading } = useCurrentLocation();

  return (
    <ConnectedTripScreen
      currentHeading={currentHeading}
      currentLocation={currentLocation}
      insetsBottom={insets.bottom}
      insetsTop={insets.top}
      isDark={isDark}
      router={router}
    />
  );
}

function ConnectedTripScreen({
  currentHeading,
  currentLocation,
  insetsBottom,
  insetsTop,
  isDark,
  router,
}: {
  currentHeading?: number | null;
  currentLocation?: readonly [number, number] | null;
  insetsBottom: number;
  insetsTop: number;
  isDark: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const trip = useQuery(getTripDashboardRef, { travelerSlug: currentDemoTravelerSlug });

  if (!trip) {
    return (
      <ThemedView style={styles.root}>
        <WandrHeader
          config={{
            overlay: true,
            title: 'Day plan',
            trailingActions: [{ kind: 'notifications', accessibilityLabel: 'Notifications', tone: 'surface' }],
          }}
        />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insetsTop + 72, paddingBottom: insetsBottom + designSystem.spacing.xxxl + 88 },
          ]}>
          <TripHeroSkeleton />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <TripScreenView
      currentHeading={currentHeading}
      currentLocation={currentLocation}
      insetsBottom={insetsBottom}
      insetsTop={insetsTop}
      isDark={isDark}
      router={router}
      trip={trip}
      useSkeletons={false}
    />
  );
}

function TripScreenView({
  currentHeading,
  currentLocation,
  insetsBottom,
  insetsTop,
  isDark,
  router,
  trip,
  useSkeletons,
}: {
  currentHeading?: number | null;
  currentLocation?: readonly [number, number] | null;
  insetsBottom: number;
  insetsTop: number;
  isDark: boolean;
  router: ReturnType<typeof useRouter>;
  trip: TripDashboard;
  useSkeletons: boolean;
}) {
  const items = trip.items;
  const progress = trip.progressPercentage;
  const activeExperience = trip.activeItem?.experience ?? null;
  const activeCoordinate = activeExperience?.coordinate;
  const weatherCoordinate = currentLocation ?? activeCoordinate ?? trip.centerCoordinate;
  const mapMarkers = buildTripMapMarkers(items, 10);

  return (
    <ThemedView style={styles.root}>
      <WandrHeader
        config={{
          overlay: true,
          title: 'Day plan',
          trailingActions: [{ kind: 'notifications', accessibilityLabel: 'Notifications', tone: 'surface' }],
        }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insetsTop + 72, paddingBottom: insetsBottom + designSystem.spacing.xxxl + 88 },
        ]}>
        {useSkeletons ? (
          <TripHeroSkeleton />
        ) : (
          <View style={styles.hero}>
            <ThemedText style={styles.heroTitle}>{trip.dayTitle}</ThemedText>

            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
              <View style={styles.progressRow}>
                <ThemedText style={[styles.progressLabel, isDark && styles.progressLabelDark]}>Daily Progress</ThemedText>
                <ThemedText style={[styles.progressValue, isDark && styles.progressValueDark]}>{progress}% COMPLETED</ThemedText>
              </View>
            </View>
          </View>
        )}

        {useSkeletons ? (
          <TripActionSkeletons />
        ) : (
          <View style={styles.actionsRow}>
            <Pressable style={[styles.actionBtn, isDark && styles.actionBtnDark, styles.actionBtnPrimary]} onPress={() => router.push('/trip/map')}>
              <NavigationArrow color={designSystem.colors.darkGreen} weight="bold" size={20} />
              <ThemedText style={styles.actionBtnPrimaryText}>Navigate</ThemedText>
            </Pressable>
            <Pressable style={[styles.actionBtn, isDark && styles.actionBtnDark]}>
              <ShareNetwork color={isDark ? designSystem.colors.darkMutedText : designSystem.colors.warmDark} weight="bold" size={20} />
              <ThemedText style={[styles.actionBtnText, isDark && styles.actionBtnTextDark]}>Share</ThemedText>
            </Pressable>
          </View>
        )}

        {useSkeletons ? (
          <TripTimelineSkeleton />
        ) : items.length === 0 ? (
          <View style={[styles.emptyState, isDark && styles.emptyStateDark]}>
            <ThemedText style={styles.emptyTitle}>No plans yet</ThemedText>
            <ThemedText style={[styles.emptyDesc, isDark && styles.emptyDescDark]}>
              Head over to Explore to book experiences and add them to your trip.
            </ThemedText>
            <Link href="/explore" asChild>
              <Pressable style={[styles.actionBtn, isDark && styles.actionBtnDark, styles.actionBtnPrimary, { marginTop: 16 }]}>
                <ThemedText style={styles.actionBtnPrimaryText}>Explore Experiences</ThemedText>
              </Pressable>
            </Link>
          </View>
        ) : (
          <TripTimelineSection items={items} />
        )}

        {useSkeletons ? (
          <TripBentoSkeletons />
        ) : (
          <View style={styles.bentoGrid}>
            <WeatherCard latitude={weatherCoordinate[1]} longitude={weatherCoordinate[0]} />
            <LiveLocationCard
              title={activeExperience?.title ?? 'Live Location'}
              subtitle={activeExperience?.locationLabel ?? trip.locationLabel}
              centerCoordinate={currentLocation ?? trip.centerCoordinate}
              userCoordinate={currentLocation}
              userHeading={currentHeading}
              markers={mapMarkers}
            />
          </View>
        )}
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
    gap: designSystem.spacing.xxxl,
  },
  hero: {
    paddingTop: 24,
    gap: 24,
  },
  heroTitle: {
    fontSize: 40,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -1.4,
    textTransform: 'uppercase',
  },
  progressContainer: {
    gap: 8,
  },
  progressBarBg: {
    height: 32,
    backgroundColor: 'rgba(159, 232, 112, 0.1)',
    borderRadius: 16,
    padding: 6,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: designSystem.colors.lime,
    borderRadius: 10,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: designSystem.colors.warmDark,
  },
  progressLabelDark: {
    color: designSystem.colors.darkMutedText,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '900',
    color: designSystem.colors.darkGreen,
  },
  progressValueDark: {
    color: designSystem.colors.lime,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 72,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(14,15,12,0.12)',
  },
  actionBtnDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorder,
  },
  actionBtnPrimary: {
    backgroundColor: designSystem.colors.lime,
    borderColor: designSystem.colors.lime,
  },
  actionBtnText: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: '700',
    color: designSystem.colors.warmDark,
  },
  actionBtnTextDark: {
    color: designSystem.colors.darkMutedText,
  },
  actionBtnPrimaryText: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: '700',
    color: designSystem.colors.darkGreen,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.surface,
    borderRadius: designSystem.radii.panel,
    borderWidth: 1,
    borderColor: 'rgba(14,15,12,0.12)',
    gap: 8,
  },
  emptyStateDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorder,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  emptyDesc: {
    fontSize: 16,
    color: designSystem.colors.warmDark,
    textAlign: 'center',
  },
  emptyDescDark: {
    color: designSystem.colors.darkMutedText,
  },
  bentoGrid: {
    flexDirection: 'column',
    gap: 16,
    marginTop: 16,
    marginBottom: 8,
  },
});
