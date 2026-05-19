import { useMutation } from 'convex/react';
import { useEffect, useState } from 'react';

import {
  ProfileSettingScreen,
  SettingSwitchRow,
} from '@/components/wandr/profile/profile-setting-screen';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useCurrentUserSettings } from '@/hooks/use-current-user-settings';
import { updateNotificationSettingsRef } from '@/lib/convex';

export default function NotificationSettingsScreen() {
  const traveler = useCurrentTraveler();
  const settings = useCurrentUserSettings();
  const updateNotificationSettings = useMutation(updateNotificationSettingsRef);
  const [tripAlertsEnabled, setTripAlertsEnabled] = useState(true);
  const [messagesEnabled, setFriendMessagesEnabled] = useState(true);
  const [bookingUpdatesEnabled, setBookingUpdatesEnabled] = useState(true);
  const [productUpdatesEnabled, setProductUpdatesEnabled] = useState(false);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setTripAlertsEnabled(settings.tripAlertsEnabled);
    setFriendMessagesEnabled(settings.messagesEnabled);
    setBookingUpdatesEnabled(settings.bookingUpdatesEnabled);
    setProductUpdatesEnabled(settings.productUpdatesEnabled);
  }, [settings]);

  const saveNotifications = async ({
    nextTripAlertsEnabled = tripAlertsEnabled,
    nextFriendMessagesEnabled = messagesEnabled,
    nextBookingUpdatesEnabled = bookingUpdatesEnabled,
    nextProductUpdatesEnabled = productUpdatesEnabled,
  }: {
    nextTripAlertsEnabled?: boolean;
    nextFriendMessagesEnabled?: boolean;
    nextBookingUpdatesEnabled?: boolean;
    nextProductUpdatesEnabled?: boolean;
  }) => {
    if (!traveler?.slug) {
      return;
    }

    try {
      await updateNotificationSettings({
        travelerSlug: traveler.slug,
        tripAlertsEnabled: nextTripAlertsEnabled,
        messagesEnabled: nextFriendMessagesEnabled,
        bookingUpdatesEnabled: nextBookingUpdatesEnabled,
        productUpdatesEnabled: nextProductUpdatesEnabled,
      });
    } catch (error) {
      console.error('Failed to update notification settings', error);
    }
  };

  return (
    <ProfileSettingScreen title="Notification settings" bottomNote="Changes save instantly. The notification inbox stays separate.">
      <SettingSwitchRow
        label="Trip alerts"
        value={tripAlertsEnabled}
        onValueChange={(nextTripAlertsEnabled) => {
          setTripAlertsEnabled(nextTripAlertsEnabled);
          void saveNotifications({ nextTripAlertsEnabled });
        }}
      />
      <SettingSwitchRow
        label="Friend messages"
        value={messagesEnabled}
        onValueChange={(nextFriendMessagesEnabled) => {
          setFriendMessagesEnabled(nextFriendMessagesEnabled);
          void saveNotifications({ nextFriendMessagesEnabled });
        }}
      />
      <SettingSwitchRow
        label="Booking updates"
        value={bookingUpdatesEnabled}
        onValueChange={(nextBookingUpdatesEnabled) => {
          setBookingUpdatesEnabled(nextBookingUpdatesEnabled);
          void saveNotifications({ nextBookingUpdatesEnabled });
        }}
      />
      <SettingSwitchRow
        label="Product updates"
        value={productUpdatesEnabled}
        onValueChange={(nextProductUpdatesEnabled) => {
          setProductUpdatesEnabled(nextProductUpdatesEnabled);
          void saveNotifications({ nextProductUpdatesEnabled });
        }}
      />
    </ProfileSettingScreen>
  );
}
