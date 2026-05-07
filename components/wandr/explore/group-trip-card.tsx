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
import { useResponsive } from '@/hooks/use-responsive';
import { requestJoinExploreTripRef } from '@/lib/convex';
import type { ExploreJoinableTripCard } from '@/types/explore';

const CARD_RADIUS = 32;

export function ExploreGroupTripCard({
  card,
  href,
  onOpen,
}: {
  card: ExploreJoinableTripCard;
  href?: Href;
  onOpen?: () => void;
}) {
  const router = useRouter();
  const traveler = useCurrentTraveler();
  const { isLargeScreen } = useResponsive();
  const requestJoinTrip = useMutation(requestJoinExploreTripRef);
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  const handleOpen = () => {
    if (onOpen) {
      onOpen();
    } else if (href) {
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
    <View style={[styles.shell, isLargeScreen && styles.shellLarge]}>
      <Pressable
        accessibilityRole={(href || onOpen) ? 'button' : undefined}
        onPress={(href || onOpen) ? handleOpen : undefined}
        style={[styles.pressable, isLargeScreen && styles.pressableLarge]}
      >
        <Image source={card.experienceImageUri} contentFit="cover" style={styles.backgroundImage} />
        <LinearGradient
          colors={[designSystem.colors.scrimTransparent, designSystem.colors.border, designSystem.colors.scrim, designSystem.colors.scrimStrong, designSystem.colors.scrimSolid]}
          locations={[0, 0.18, 0.42, 0.72, 1]}
          style={[styles.gradient, isLargeScreen && styles.gradientLarge]}
        />
        <View style={[styles.body, isLargeScreen && styles.bodyLarge]}>
          <ThemedText style={[styles.title, isLargeScreen && styles.titleLarge]}>{card.groupName}</ThemedText>
          <ThemedText style={[styles.subtitle, isLargeScreen && styles.subtitleLarge]}>{card.experienceTitle}</ThemedText>
          <ThemedText style={[styles.meta, isLargeScreen && styles.metaLarge]}>
            {card.hostName} • {card.memberCount} travelers • {card.locationLabel}
          </ThemedText>
          <View style={styles.footer}>
            <TravelerAvatarStack
              avatars={card.avatarUris}
              fallbackName={card.hostName || card.groupName}
              fallbackPaletteKey={card.circleId}
              totalCount={card.memberCount}
            />
            <Pressable
              accessibilityLabel={hasRequested ? 'Join request sent' : `Join ${card.groupName}`}
              disabled={hasRequested || isRequesting}
              onPress={(event) => {
                event.stopPropagation();
                void handleJoin();
              }}
              style={[
                styles.actionButton,
                isLargeScreen && styles.actionButtonLarge,
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
  shellLarge: {
    width: 260,
    borderRadius: 24,
  },
  pressable: {
    minHeight: 520,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  pressableLarge: {
    minHeight: 304,
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
  gradientLarge: {
    top: 76,
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 172,
    paddingBottom: 18,
    gap: 8,
    backgroundColor: 'transparent',
  },
  bodyLarge: {
    paddingHorizontal: 16,
    paddingTop: 92,
    paddingBottom: 16,
    gap: 7,
  },
  title: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '600',
    color: designSystem.colors.cream,
  },
  titleLarge: {
    fontSize: 19,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.creamMuted,
  },
  subtitleLarge: {
    fontSize: 13,
    lineHeight: 18,
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.creamSubtle,
  },
  metaLarge: {
    fontSize: 12,
    lineHeight: 16,
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
  actionButtonLarge: {
    minWidth: 82,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
  },
  actionText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
  },
});
