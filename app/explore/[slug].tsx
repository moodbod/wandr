import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExperienceFeatureCard, type ExperienceFeatureCardItem } from '@/components/wandr/explore/experience-feature-card';
import { JourneyCtaCard } from '@/components/wandr/explore/journey-cta-card';
import { WandrHeader } from '@/components/wandr/header';
import { designSystem } from '@/constants/design-system';
import { bookExperienceRef, ensureExploreCommunitySeedRef, getExplorePageContentRef, hasConvexUrl } from '@/lib/convex';
import { currentDemoTravelerSlug } from '@/lib/demo-session';

export default function ExploreExperienceScreen() {
  if (!hasConvexUrl) {
    return null;
  }

  return <ConnectedExploreExperienceScreen />;
}

function ConnectedExploreExperienceScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const page = useQuery(getExplorePageContentRef, { slug: 'default' });
  const ensureCommunitySeed = useMutation(ensureExploreCommunitySeedRef);
  const bookExperience = useMutation(bookExperienceRef);
  const [bookingAction, setBookingAction] = useState<'primary' | 'secondary' | null>(null);

  useEffect(() => {
    void ensureCommunitySeed({});
  }, [ensureCommunitySeed]);

  if (page === undefined) {
    return null;
  }

  if (page === null || !slug) {
    return null;
  }

  const experience = page.experiences.find((item) => item.slug === slug);

  if (!experience) {
    return null;
  }

  const locationLabel = experience.locationLabel ?? page.home.hero.locationLabel;
  const galleryImages = experience.galleryImages?.length ? experience.galleryImages : [experience.imageUri];
  const titleWords = experience.title
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);
  const travelerCount = experience.travelerMomentum?.visitorCount ?? 0;
  const shouldShowTravelerMomentum = travelerCount > 0;
  const travelerHeadingLabel =
    travelerCount === 1
      ? `1 person from ${experience.travelerMomentum?.countryLabel} is visiting`
      : `People from ${experience.travelerMomentum?.countryLabel} are visiting`;
  const travelerSummary = experience.travelerMomentum
    ? `${travelerCount} ${travelerCount === 1 ? 'traveler' : 'travelers'} from ${
        experience.travelerMomentum.countryLabel
      } booked this experience in the app.`
    : null;
  const tripFitItems: readonly ExperienceFeatureCardItem[] =
    experience.tripFit?.length
      ? (experience.tripFit as unknown as ExperienceFeatureCardItem[])
      : [
          experience.category
            ? {
                label: 'Category',
                value: experience.category.toUpperCase(),
                detail: 'A strong fit if this is the energy you want the day to hold.',
                icon: 'compass' as const,
                tone: 'dark' as const,
              }
            : null,
          experience.durationLabel
            ? {
                label: 'Duration',
                value: experience.durationLabel.toUpperCase(),
                detail: 'Useful when you are balancing this booking with the rest of the trip.',
                icon: 'clock' as const,
                tone: 'accent' as const,
              }
            : null,
          experience.groupSizeLabel
            ? {
                label: 'Group Size',
                value: experience.groupSizeLabel.toUpperCase(),
                detail: 'Helps you judge whether this works better solo, as a pair, or with friends.',
                icon: 'users' as const,
                tone: 'light' as const,
              }
            : null,
        ].filter((item): item is NonNullable<typeof item> => Boolean(item)) as ExperienceFeatureCardItem[];

  const handleBookWithoutTrip = async () => {
    if (bookingAction) {
      return;
    }

    setBookingAction('secondary');
    try {
      await bookExperience({
        experienceSlug: experience.slug,
        travelerSlug: currentDemoTravelerSlug,
      });
    } finally {
      setBookingAction(null);
    }
  };

  return (
    <ThemedView style={styles.root}>
      <WandrHeader
        config={{
          overlay: true,
          leadingAction: { kind: 'back', accessibilityLabel: 'Go back' },
          trailingActions: [{ kind: 'favorite', accessibilityLabel: 'Save experience' }],
        }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 72, paddingBottom: insets.bottom + designSystem.spacing.xxxl },
        ]}>
        <View style={styles.titleBlock}>
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>{experience.badge}</ThemedText>
          </View>
          <View style={styles.titleStack}>
            <ThemedText
              adjustsFontSizeToFit
              minimumFontScale={0.4}
              numberOfLines={1}
              style={styles.title}>
              {experience.title.toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText style={styles.subtitle}>{locationLabel}</ThemedText>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.galleryRail}>
          {galleryImages.map((imageUri, index) => (
            <View key={`${imageUri}-${index}`} style={styles.galleryCard}>
              <Image source={imageUri} contentFit="cover" style={styles.galleryImage} />
            </View>
          ))}
        </ScrollView>

        <ThemedText style={styles.summary}>{experience.description}</ThemedText>

        {shouldShowTravelerMomentum && experience.travelerMomentum ? (
          <View style={styles.socialProof}>
            <View style={styles.socialProofCopy}>
              <View style={styles.avatarStack}>
                {travelerCount > 1 ? <View style={styles.avatar} /> : null}
                {travelerCount > 1 ? (
                  <View style={[styles.avatar, styles.avatarOffset, { backgroundColor: '#dfe9d6' }]} />
                ) : null}
                <View style={[styles.avatarCount, travelerCount > 1 ? styles.avatarOffset : null]}>
                  <ThemedText style={styles.avatarCountText}>+{experience.travelerMomentum.visitorCount}</ThemedText>
                </View>
              </View>
              <ThemedText style={styles.socialProofTitle}>{travelerHeadingLabel}</ThemedText>
            </View>
            <ThemedText style={styles.socialProofText}>{travelerSummary}</ThemedText>
          </View>
        ) : null}

        {tripFitItems.length > 0 ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Trip Fit</ThemedText>
            <View style={styles.tripFitColumn}>
              {tripFitItems.map((item, index) => (
                <ExperienceFeatureCard
                  key={`${item.label}-${item.value}`}
                  {...item}
                  tone={item.tone ?? (index % 3 === 0 ? 'dark' : index % 3 === 1 ? 'light' : 'accent')}
                />
              ))}
            </View>
          </View>
        ) : null}

        {experience.includes.length > 0 ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Included</ThemedText>
            <View style={styles.includedList}>
              {experience.includes.map((item) => (
                <View key={item} style={styles.includedRow}>
                  <View style={styles.bullet} />
                  <ThemedText type="defaultSemiBold" style={styles.infoText}>
                    {item}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <JourneyCtaCard
            loadingAction={bookingAction}
            primaryLabel={experience.booking?.addToTripLabel ?? 'Add to trip'}
            secondaryLabel="Start journey"
            onPrimaryPress={async () => {
              if (bookingAction) {
                return;
              }

              setBookingAction('primary');
              try {
                await bookExperience({
                  experienceSlug: experience.slug,
                  travelerSlug: currentDemoTravelerSlug,
                });
                router.push('/trip/day-plan');
              } finally {
                setBookingAction(null);
              }
            }}
            onSecondaryPress={() => {
              void handleBookWithoutTrip();
            }}
          />
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
    gap: designSystem.spacing.xxxl,
  },
  titleBlock: {
    paddingTop: 64,
    gap: 8,
  },
  titleStack: {
    width: '100%',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: designSystem.colors.lime,
    borderRadius: designSystem.radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: designSystem.colors.darkGreen,
  },
  title: {
    fontSize: 58,
    lineHeight: 58,
    fontWeight: '900',
    letterSpacing: -1.8,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: designSystem.colors.warmDark,
  },
  galleryRail: {
    gap: 12,
    paddingRight: designSystem.spacing.lg,
  },
  galleryCard: {
    width: 340,
    height: 430,
    borderRadius: designSystem.radii.feature,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  socialProof: {
    gap: 14,
  },
  socialProofCopy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: designSystem.colors.mint,
    borderWidth: 2,
    borderColor: designSystem.colors.surface,
  },
  avatarOffset: {
    marginLeft: -12,
  },
  avatarCount: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.lime,
    borderWidth: 2,
    borderColor: designSystem.colors.surface,
    paddingHorizontal: 6,
  },
  avatarCountText: {
    fontSize: 10,
    lineHeight: 10,
    fontWeight: '900',
    color: designSystem.colors.darkGreen,
  },
  socialProofTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
  socialProofText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  section: {
    gap: 18,
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 30,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -1,
    textTransform: 'uppercase',
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  tripFitColumn: {
    gap: 16,
  },
  includedList: {
    gap: 12,
  },
  includedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: designSystem.colors.lime,
    marginTop: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    gap: 16,
    marginTop: 12,
  },
});
