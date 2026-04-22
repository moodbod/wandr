import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { Id } from '@/convex/_generated/dataModel';

import { currentDemoTravelerSlug } from '@/lib/demo-session';
import {
  ARRIVAL_RADIUS_METERS,
  ensureNotificationSetupAsync,
  parseTripNotificationPayload,
  presentArrivalNotification,
  scheduleRatingNotification,
  type TripNotificationPayload,
} from '@/lib/notifications';
import {
  getTripDashboardRef,
  recordTripArrivalRef,
  submitExperienceRatingRef,
} from '@/lib/convex';
import { useCurrentLocation } from '@/hooks/use-current-location';
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
  const trip = useQuery(getTripDashboardRef, {
    travelerSlug: currentDemoTravelerSlug,
  });
  const recordArrival = useMutation(recordTripArrivalRef);
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
      bookingId: activeItem._id as Id<'experienceBookings'>,
      travelerSlug: currentDemoTravelerSlug,
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

        await scheduleRatingNotification({
          kind: 'rating',
          ...basePayload,
        });
      })
      .catch(() => {
        handledBookingIdsRef.current.delete(activeItem._id);
      });
  }, [currentLocation, recordArrival, trip]);

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
        travelerSlug: currentDemoTravelerSlug,
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
