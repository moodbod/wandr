import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CaretLeft, HeartStraight, ShareNetwork } from 'phosphor-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo } from 'react';
import { useQuery } from 'convex/react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MapPreview } from '@/components/wandr/maps/map-preview';
import { designSystem } from '@/constants/design-system';
import { getStayBySlug, rankStayProperties } from '@/constants/stays-content';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { currentDemoTravelerSlug } from '@/lib/demo-session';
import { getTripDashboardRef, listUserTripsRef } from '@/lib/convex';

export function StayDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const trips = useQuery(listUserTripsRef, { travelerSlug: currentDemoTravelerSlug });
  const selectedTripId = trips?.[0]?._id;
  const trip = useQuery(getTripDashboardRef, {
    travelerSlug: currentDemoTravelerSlug,
    tripId: selectedTripId,
  });
  const currentLocation = useCurrentLocation();
  const rankedStays = useMemo(
    () =>
      rankStayProperties({
        trip,
        currentCoordinate: currentLocation.coordinate,
      }),
    [currentLocation.coordinate, trip]
  );
  const stay = rankedStays.find((item) => item.slug === slug) ?? rankedStays.find((item) => item.slug === getStayBySlug(slug)?.slug) ?? rankedStays[0];

  if (!stay) {
    return null;
  }

  return (
    <ThemedView style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120 }}
      >
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <View style={styles.avatarShell}>
              <Image
                source="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&q=80&fit=crop"
                contentFit="cover"
                style={styles.avatarImage}
              />
            </View>
            <ThemedText style={styles.brandText}>Wandr</ThemedText>
          </View>
          <View style={styles.topRight}>
            <View style={styles.topIcon}><ShareNetwork size={18} color={designSystem.colors.ink} weight="bold" /></View>
            <View style={styles.topIcon}><HeartStraight size={18} color={designSystem.colors.ink} weight="fill" /></View>
            <Pressable style={styles.topIcon} onPress={() => router.back()}>
              <CaretLeft size={18} color={designSystem.colors.ink} weight="bold" />
            </Pressable>
          </View>
        </View>

        <View style={styles.pagePadding}>
          <View style={styles.heroShell}>
            <Image source={stay.galleryImages[0] ?? stay.imageUri} contentFit="cover" style={styles.heroImage} />
            <View style={styles.heroOverlay}>
              <View style={styles.editorBadge}>
                <ThemedText style={styles.editorBadgeText}>{"Editor's Choice"}</ThemedText>
              </View>
              <ThemedText style={styles.heroTitle}>{stay.name.toUpperCase()}</ThemedText>
            </View>
          </View>

          <View style={[styles.socialProofCard, isDark && styles.surfaceDark]}>
            <View style={styles.socialProofLeft}>
              <View style={styles.travelerStack}>
                <View style={styles.smallAvatar}>
                  <Image source="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80&fit=crop" contentFit="cover" style={styles.smallAvatarImage} />
                </View>
                <View style={styles.smallAvatar}>
                  <Image source="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80&fit=crop" contentFit="cover" style={styles.smallAvatarImage} />
                </View>
                <View style={styles.countBubble}>
                  <ThemedText style={styles.countBubbleText}>+{Math.max(stay.reviewCount - 2, 39)}</ThemedText>
                </View>
              </View>
              <ThemedText style={styles.socialProofText}>
                {stay.reviewCount} travelers from Germany visited recently
              </ThemedText>
            </View>
            <View style={styles.flagBadge}>
              <ThemedText style={styles.flagText}>DE</ThemedText>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>The Space</ThemedText>
            <ThemedText style={styles.sectionBody}>
              {stay.summary} {stay.bookingNote}
            </ThemedText>
            <View style={styles.chipGrid}>
              {stay.amenities.map((item) => (
                <View key={item} style={[styles.amenityChip, isDark && styles.surfaceDark]}>
                  <ThemedText style={styles.amenityText}>{item}</ThemedText>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.ratingPanel, isDark && styles.surfaceDark]}>
            <View style={styles.ratingHeader}>
              <View style={styles.ratingScoreRow}>
                <ThemedText style={styles.ratingScore}>{stay.rating.toFixed(2)}</ThemedText>
                <ThemedText style={styles.ratingOutOf}>/ 5</ThemedText>
              </View>
              <ThemedText style={styles.starsText}>★★★★★</ThemedText>
            </View>
            <View style={styles.ratingRows}>
              <RatingRow label="Cleanliness" value={98} />
              <RatingRow label="Accuracy" value={95} />
              <RatingRow label="Communication" value={100} />
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Guest Journals</ThemedText>
            <View style={styles.reviewList}>
              <ReviewCard
                name="Marcus Thorne"
                visitedAt="Visited Oct 2023"
                quote={`“${stay.sleepSignal} Waking up near ${stay.matchedStopLabel} changed the pacing of the whole route.”`}
              />
              <ReviewCard
                name="Lena Headey"
                visitedAt="Visited Sep 2023"
                quote={`“Minimal, comfortable, and exactly where we needed it. The route fit mattered more than we expected.”`}
              />
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>The Neighborhood</ThemedText>
            <View style={styles.neighborhoodMap}>
              <MapPreview
                centerCoordinate={stay.coordinate}
                userCoordinate={currentLocation.coordinate}
                markers={[
                  {
                    id: stay.id,
                    coordinate: stay.coordinate,
                    label: stay.name,
                    priceLabel: stay.priceLabel,
                    tone: 'accent',
                    status: 'active',
                  },
                ]}
                zoomLevel={8}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <View>
          <ThemedText style={styles.bottomBarLabel}>Starting From</ThemedText>
          <ThemedText style={styles.bottomBarPrice}>
            {stay.priceLabel}
            <ThemedText style={styles.bottomBarSuffix}> /night</ThemedText>
          </ThemedText>
        </View>
        <View style={styles.bookNearbyButton}>
          <ThemedText style={styles.bookNearbyText}>Book Nearby</ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

function RatingRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.ratingRow}>
      <ThemedText style={styles.ratingLabel}>{label}</ThemedText>
      <View style={styles.ratingTrack}>
        <View style={[styles.ratingFill, { width: `${value}%` }]} />
      </View>
    </View>
  );
}

function ReviewCard({
  name,
  visitedAt,
  quote,
}: {
  name: string;
  visitedAt: string;
  quote: string;
}) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatar}>
          <Image source="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80&fit=crop" contentFit="cover" style={styles.smallAvatarImage} />
        </View>
        <View>
          <ThemedText style={styles.reviewName}>{name}</ThemedText>
          <ThemedText style={styles.reviewVisited}>{visitedAt}</ThemedText>
        </View>
      </View>
      <ThemedText style={styles.reviewQuote}>{quote}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: designSystem.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarShell: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  brandText: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '800',
    color: '#0e0f0c',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagePadding: {
    paddingHorizontal: 16,
    gap: 26,
  },
  heroShell: {
    aspectRatio: 0.8,
    borderRadius: 28,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    gap: 10,
  },
  editorBadge: {
    alignSelf: 'flex-start',
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.lime,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editorBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: designSystem.colors.darkGreen,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -1.2,
    color: '#ffffff',
  },
  socialProofCard: {
    borderRadius: 22,
    backgroundColor: '#f4f4f1',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  surfaceDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderWidth: 1,
    borderColor: designSystem.colors.darkBorder,
  },
  socialProofLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  travelerStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: -6,
    borderWidth: 2,
    borderColor: designSystem.colors.background,
  },
  smallAvatarImage: {
    width: '100%',
    height: '100%',
  },
  countBubble: {
    minWidth: 32,
    height: 28,
    borderRadius: 14,
    backgroundColor: designSystem.colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBubbleText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    color: designSystem.colors.darkGreen,
  },
  socialProofText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: '#11120d',
  },
  flagBadge: {
    width: 26,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#f3d34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    color: '#11120d',
  },
  section: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: -0.7,
    textTransform: 'uppercase',
    color: '#10110d',
  },
  sectionBody: {
    fontSize: 16,
    lineHeight: 28,
    fontWeight: '600',
    color: '#161713',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  amenityChip: {
    borderRadius: 999,
    backgroundColor: '#f4f4f1',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  amenityText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
    color: '#161713',
  },
  ratingPanel: {
    borderRadius: 24,
    backgroundColor: '#f4f4f1',
    padding: 22,
    gap: 18,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingScoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  ratingScore: {
    fontSize: 40,
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  ratingOutOf: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
    color: '#7f817b',
  },
  starsText: {
    fontSize: 26,
    lineHeight: 26,
    color: '#1f7c18',
  },
  ratingRows: {
    gap: 14,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  ratingLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: '#10110d',
  },
  ratingTrack: {
    width: 112,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#d9dbd3',
    overflow: 'hidden',
  },
  ratingFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#10110d',
  },
  reviewList: {
    gap: 16,
  },
  reviewCard: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dedfd8',
    padding: 18,
    gap: 14,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
  },
  reviewName: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
    color: '#11120d',
  },
  reviewVisited: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#8b8e87',
  },
  reviewQuote: {
    fontSize: 15,
    lineHeight: 28,
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#161713',
  },
  neighborhoodMap: {
    height: 220,
    borderRadius: 28,
    overflow: 'hidden',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(249,249,246,0.94)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  bottomBarLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#8b8e87',
  },
  bottomBarPrice: {
    marginTop: 6,
    fontSize: 34,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -1.4,
    color: '#10110d',
  },
  bottomBarSuffix: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
    color: '#8b8e87',
  },
  bookNearbyButton: {
    minWidth: 156,
    height: 52,
    borderRadius: 999,
    backgroundColor: designSystem.colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  bookNearbyText: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: -0.6,
    color: designSystem.colors.darkGreen,
  },
});
