import { useMutation } from 'convex/react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TravelerAvatarStack } from '@/components/wandr/traveler-avatar-stack';
import { designSystem } from '@/constants/design-system';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { requestJoinExploreTripRef } from '@/lib/convex';
import type { ExploreJoinableTripCard } from '@/types/explore';

const CARD_RADIUS = 32;

export function ExploreGroupTripCard({
  card,
  href,
}: {
  card: ExploreJoinableTripCard;
  href?: Href;
}) {
  const router = useRouter();
  const traveler = useCurrentTraveler();
  const requestJoinTrip = useMutation(requestJoinExploreTripRef);
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  const handleOpen = () => {
    if (href) {
      router.push(href);
    }
  };

  const handleJoin = async () => {
    if (!traveler?.slug || isRequesting || hasRequested) {
      return;
    }

    setIsRequesting(true);
    try {
      const requested = await requestJoinTrip({
        travelerSlug: traveler.slug,
        circleId: card.circleId as never,
        experienceSlug: card.experienceSlug,
      });
      if (requested) {
        setHasRequested(true);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <View style={styles.shell}>
      <Pressable accessibilityRole={href ? 'button' : undefined} onPress={href ? handleOpen : undefined} style={styles.pressable}>
        <Image source={card.experienceImageUri} contentFit="cover" style={styles.backgroundImage} />
        <LinearGradient
          colors={[designSystem.colors.scrimTransparent, designSystem.colors.border, designSystem.colors.scrim, designSystem.colors.scrimStrong, designSystem.colors.scrimSolid]}
          locations={[0, 0.18, 0.42, 0.72, 1]}
          style={styles.gradient}
        />
        <View style={styles.body}>
          <ThemedText style={styles.title}>{card.groupName}</ThemedText>
          <ThemedText style={styles.subtitle}>{card.experienceTitle}</ThemedText>
          <ThemedText style={styles.meta}>
            {card.hostName} • {card.memberCount} travelers • {card.locationLabel}
          </ThemedText>
          <View style={styles.footer}>
            <TravelerAvatarStack avatars={card.avatarUris} totalCount={card.memberCount} />
            <Pressable
              accessibilityLabel={hasRequested ? 'Join request sent' : `Join ${card.groupName}`}
              disabled={hasRequested || isRequesting}
              onPress={(event) => {
                event.stopPropagation();
                void handleJoin();
              }}
              style={[
                styles.actionButton,
                hasRequested || isRequesting ? styles.actionDisabled : null,
              ]}>
              <ThemedText
                lightColor={designSystem.colors.oliveInk}
                darkColor={designSystem.colors.oliveInk}
                style={styles.actionText}
              >
                {hasRequested ? 'Requested' : isRequesting ? 'Joining...' : 'Join'}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  pressable: {
    minHeight: 520,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 120,
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 172,
    paddingBottom: 18,
    gap: 8,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '600',
    color: designSystem.colors.cream,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.creamMuted,
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.creamSubtle,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 4,
  },
  actionDisabled: {
    opacity: 0.7,
  },
  actionButton: {
    minWidth: 104,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: designSystem.colors.lime,
  },
  actionText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
  },
});
