import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CaretRight } from 'phosphor-react-native';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExperienceGalleryCarousel } from '@/components/wandr/explore/experience-gallery-carousel';
import { styles } from '@/components/wandr/explore/explore-group-trip-detail-screen.styles';
import { TravelerAvatarStack } from '@/components/wandr/traveler-avatar-stack';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import type { Id } from '@/convex/_generated/dataModel';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useRequireAuthAction } from '@/hooks/use-require-auth-action';
import { useResponsive } from '@/hooks/use-responsive';
import { getExploreGroupTripDetailRef, requestJoinExploreTripRef } from '@/lib/convex';
import { useEffect, useState } from 'react';

export default function ExploreGroupTripDetailScreen({
  circleId: circleIdProp,
  onClose,
}: {
  circleId?: string;
  onClose?: () => void;
} = {}) {
  const { circleId: routeCircleId } = useLocalSearchParams<{ circleId: string }>();
  const circleId = circleIdProp ?? routeCircleId;
  const router = useRouter();
  const traveler = useCurrentTraveler();
  const requireAuthAction = useRequireAuthAction();
  const insets = useSafeAreaInsets();
  const { isLargeScreen } = useResponsive();
  const shouldRedirectToExploreShell = isLargeScreen && !circleIdProp && Boolean(circleId);

  useEffect(() => {
    if (!shouldRedirectToExploreShell || !circleId) {
      return;
    }

    router.replace({
      pathname: '/explore',
      params: { groupCircleId: circleId },
    });
  }, [circleId, router, shouldRedirectToExploreShell]);

  const detail = useQuery(
    getExploreGroupTripDetailRef,
    circleId && !shouldRedirectToExploreShell
      ? { circleId: circleId as Id<'circles'>, travelerSlug: traveler?.slug }
      : 'skip'
  );
  const requestJoin = useMutation(requestJoinExploreTripRef);
  const [isRequesting, setIsRequesting] = useState(false);

  if (shouldRedirectToExploreShell) {
    return null;
  }

  const handleJoin = async () => {
    if (
      !requireAuthAction() ||
      !traveler?.slug ||
      !detail ||
      detail.itinerary.length === 0 ||
      isRequesting ||
      detail.isMember ||
      detail.hasRequested
    ) {
      return;
    }

    setIsRequesting(true);
    try {
      await requestJoin({
        travelerSlug: traveler.slug,
        circleId: detail.circleId as Id<'circles'>,
        experienceSlug: detail.itinerary[0].experienceSlug,
      });
    } finally {
      setIsRequesting(false);
    }
  };

  if (!detail) {
    return (
      <ThemedView style={styles.root}>
        <WandrHeader
          config={{
            overlay: true,
            leadingAction: onClose
              ? { kind: 'back', accessibilityLabel: 'Close group trip', onPress: onClose }
              : { kind: 'back', accessibilityLabel: 'Go back' },
          }}
        />
      </ThemedView>
    );
  }

  const galleryImages = Array.from(
    new Set([
      detail.heroImageUri,
      ...detail.itinerary.map((item) => item.imageUri),
    ].filter(Boolean))
  );

  return (
    <ThemedView style={styles.root}>
      <WandrHeader
        config={{
          overlay: true,
          leadingAction: onClose
            ? { kind: 'back', accessibilityLabel: 'Close group trip', onPress: onClose }
            : { kind: 'back', accessibilityLabel: 'Go back' },
        }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 56 },
        ]}>
        <View style={styles.carouselContainer}>
          <ExperienceGalleryCarousel height={420} images={galleryImages} />
        </View>

        <View style={styles.paddedContent}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>{detail.groupName}</ThemedText>
            <ThemedText style={styles.subtitle}>{detail.tripName}</ThemedText>
            <ThemedText style={styles.meta}>
              {detail.hostName} - {detail.memberCount} travelers - {detail.locationLabel}
            </ThemedText>
            <TravelerAvatarStack
              avatars={detail.avatarUris}
              fallbackName={detail.hostName || detail.groupName}
              fallbackPaletteKey={detail.circleId}
              totalCount={detail.memberCount}
            />
          </View>

          <Pressable
            accessibilityLabel={
              detail.isMember
                ? 'Already joined this group trip'
                : detail.hasRequested
                  ? 'Join request sent'
                  : 'Join this group trip'
            }
            accessibilityRole="button"
            disabled={detail.isMember || detail.hasRequested || isRequesting}
            onPress={handleJoin}
            style={({ pressed }) => [
              styles.joinButton,
              pressed ? styles.joinButtonPressed : null,
              detail.isMember || detail.hasRequested || isRequesting ? styles.joinButtonDisabled : null,
            ]}>
            <ThemedText style={styles.joinButtonText}>
              {detail.isMember ? 'Joined' : detail.hasRequested ? 'Requested' : isRequesting ? 'Requesting...' : 'Join group trip'}
            </ThemedText>
          </Pressable>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Itinerary</ThemedText>
            <ThemedText style={styles.summary}>{detail.summary}</ThemedText>
            <View style={styles.itineraryList}>
              {detail.itinerary.map((item, index) => (
                <Pressable
                  key={item.bookingId}
                  onPress={() => router.push({ pathname: '/explore/[slug]', params: { slug: item.experienceSlug } })}
                  style={styles.itineraryRow}>
                  <Image source={item.imageUri} contentFit="cover" style={styles.itineraryImage} />
                  <View style={styles.itineraryCopy}>
                    <ThemedText style={styles.itineraryIndex}>Stop {index + 1}</ThemedText>
                    <ThemedText style={styles.itineraryTitle}>{item.title}</ThemedText>
                    <ThemedText style={styles.itineraryMeta}>{item.locationLabel}</ThemedText>
                  </View>
                  <CaretRight color={designSystem.colors.gray} size={18} weight="bold" />
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}
