import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { Id } from '@/convex/_generated/dataModel';

import {
  ARRIVAL_RADIUS_METERS,
  ensureNotificationSetupAsync,
  getDevicePushRegistrationAsync,
  parseTripNotificationPayload,
  presentArrivalNotification,
  scheduleRatingNotification,
  type TripNotificationPayload,
} from '@/lib/notifications';
import {
  createTripNotificationRef,
  getTripDashboardRef,
  recordTripArrivalRef,
  registerDevicePushTokenRef,
  submitExperienceRatingRef,
} from '@/lib/convex';
import { useCurrentLocation } from '@/hooks/use-current-location';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { TripNotificationSheet } from '@/components/wandr/notifications/trip-notification-sheet';

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceInMeters(from: readonly [number, number], to: readonly [number, number]) {
  const earthRadiusMeters = 6371_000;
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const startLat = toRadians(fromLat);
  const endLat = toRadians(toLat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function TripNotificationCenter() {
  const router = useRouter();
  const traveler = useCurrentTraveler();
  const travelerSlug = traveler?.slug ?? '';
  const trip = useQuery(getTripDashboardRef, {
    travelerSlug,
  });
  const recordArrival = useMutation(recordTripArrivalRef);
  const createTripNotification = useMutation(createTripNotificationRef);
  const registerDevicePushToken = useMutation(registerDevicePushTokenRef);
  const submitExperienceRating = useMutation(submitExperienceRatingRef);
  const { coordinate: currentLocation } = useCurrentLocation();

  const [activePayload, setActivePayload] = useState<TripNotificationPayload | null>(null);
  const [note, setNote] = useState('');
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handledBookingIdsRef = useRef(new Set<string>());

  useEffect(() => {
    void ensureNotificationSetupAsync();
  }, []);

  useEffect(() => {
    if (!travelerSlug || Platform.OS === 'web') {
      return;
    }

    let cancelled = false;
    void getDevicePushRegistrationAsync().then((registration) => {
      if (!registration || cancelled) {
        return;
      }
      void registerDevicePushToken({
        travelerSlug,
        ...registration,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [registerDevicePushToken, travelerSlug]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const showPromptFromNotification = (
      notification: Notifications.Notification,
      userText?: string | null
    ) => {
      const payload = parseTripNotificationPayload(notification.request.content.data);
      if (!payload) {
        return;
      }

      setActivePayload(payload);
      setNote(userText?.trim() ?? '');
      setRating(0);
    };

    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      showPromptFromNotification(notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      showPromptFromNotification(response.notification, response.userText);
      Notifications.clearLastNotificationResponse();
    });

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) {
      showPromptFromNotification(lastResponse.notification, lastResponse.userText);
      Notifications.clearLastNotificationResponse();
    }

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const activeItem = trip?.activeItem;
    const targetCoordinate = activeItem?.experience.coordinate;

    if (!activeItem || !currentLocation || !targetCoordinate || activeItem.status !== 'active') {
      return;
    }

    if (handledBookingIdsRef.current.has(activeItem._id)) {
      return;
    }

    const distanceMeters = getDistanceInMeters(currentLocation, [
      targetCoordinate[0],
      targetCoordinate[1],
    ]);

    if (distanceMeters > ARRIVAL_RADIUS_METERS) {
      return;
    }

    handledBookingIdsRef.current.add(activeItem._id);

    void recordArrival({
      bookingId: activeItem._id as Id<'bookings'>,
      travelerSlug,
      source: 'gps',
      coordinate: [currentLocation[0], currentLocation[1]],
    })
      .then(async (result) => {
        if (!result.created) {
          return;
        }

        const basePayload = {
          bookingId: activeItem._id,
          experienceSlug: activeItem.experienceSlug,
          title: activeItem.experience.title,
          locationLabel: activeItem.experience.locationLabel,
          imageUri: activeItem.experience.imageUri,
        };

        setActivePayload({
          kind: 'arrival',
          ...basePayload,
        });

        await presentArrivalNotification({
          kind: 'arrival',
          ...basePayload,
        });
        await createTripNotification({
          recipientSlug: travelerSlug,
          kind: 'trip_arrival',
          title: `You made it to ${activeItem.experience.title}`,
          body: 'This stop has been marked as visited. Open your trip to keep the day moving.',
          href: '/trip/map',
          entityId: activeItem._id,
          entityLabel: activeItem.experience.title,
        });

        await scheduleRatingNotification({
          kind: 'rating',
          ...basePayload,
        });
        await createTripNotification({
          recipientSlug: travelerSlug,
          kind: 'trip_rating',
          title: `Rate ${activeItem.experience.title}`,
          body: 'Leave a quick rating and an optional note once you have a minute.',
          href: '/notifications',
          entityId: activeItem._id,
          entityLabel: activeItem.experience.title,
        });
      })
      .catch(() => {
        handledBookingIdsRef.current.delete(activeItem._id);
      });
  }, [createTripNotification, currentLocation, recordArrival, travelerSlug, trip]);

  const handleDismiss = () => {
    setActivePayload(null);
    setNote('');
    setRating(0);
  };

  const handlePrimaryPress = async () => {
    if (!activePayload) {
      return;
    }

    if (activePayload.kind === 'arrival') {
      router.push('/trip/map');
      handleDismiss();
      return;
    }

    if (rating < 1) {
      return;
    }

    setIsSubmitting(true);

    try {
      await submitExperienceRating({
        experienceSlug: activePayload.experienceSlug,
        travelerSlug,
        rating,
        review: note.trim() || undefined,
      });
      handleDismiss();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSecondaryPress = () => {
    handleDismiss();
  };

  return (
    <TripNotificationSheet
      isSubmitting={isSubmitting}
      note={note}
      onDismiss={handleDismiss}
      onNoteChange={setNote}
      onPrimaryPress={() => {
        void handlePrimaryPress();
      }}
      onRatingChange={setRating}
      onSecondaryPress={handleSecondaryPress}
      payload={activePayload}
      rating={rating}
    />
  );
}
