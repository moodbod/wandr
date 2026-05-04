import { useMutation } from 'convex/react';
import { useEffect, useMemo, useState } from 'react';

import {
  ProfileSettingScreen,
  SettingOptionGroup,
} from '@/components/wandr/profile/profile-setting-screen';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useCurrentUserSettings } from '@/hooks/use-current-user-settings';
import { updateExperiencePreferencesRef } from '@/lib/convex';
import { getDefaultCurrencyForCountry, orderCurrenciesForCountry, type SupportedCurrencyCode } from '@/lib/currency';

type DistanceUnit = 'km' | 'mi';
type TemperatureUnit = 'celsius' | 'fahrenheit';

const distanceOptions = [
  { label: 'Kilometers', value: 'km' },
  { label: 'Miles', value: 'mi' },
] as const;

const temperatureOptions = [
  { label: 'Celsius', value: 'celsius' },
  { label: 'Fahrenheit', value: 'fahrenheit' },
] as const;

export default function PreferencesScreen() {
  const traveler = useCurrentTraveler();
  const settings = useCurrentUserSettings();
  const updateExperiencePreferences = useMutation(updateExperiencePreferencesRef);
  const defaultCurrency = getDefaultCurrencyForCountry(traveler?.countryCode);
  const [preferredCurrency, setPreferredCurrency] = useState<SupportedCurrencyCode>(defaultCurrency);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('km');
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>('celsius');

  const currencyOptions = useMemo(
    () =>
      orderCurrenciesForCountry(traveler?.countryCode).map((currency) => ({
        label: currency.code === defaultCurrency ? `${currency.code} · ${currency.label} · default` : `${currency.code} · ${currency.label}`,
        value: currency.code,
      })),
    [defaultCurrency, traveler?.countryCode]
  );

  useEffect(() => {
    if (!settings) {
      setPreferredCurrency(defaultCurrency);
      return;
    }

    setPreferredCurrency(settings.preferredCurrency as SupportedCurrencyCode);
    setDistanceUnit(settings.distanceUnit);
    setTemperatureUnit(settings.temperatureUnit);
  }, [defaultCurrency, settings]);

  const savePreferences = async ({
    nextCurrency = preferredCurrency,
    nextDistanceUnit = distanceUnit,
    nextTemperatureUnit = temperatureUnit,
  }: {
    nextCurrency?: SupportedCurrencyCode;
    nextDistanceUnit?: DistanceUnit;
    nextTemperatureUnit?: TemperatureUnit;
  }) => {
    if (!traveler?.slug) {
      return;
    }

    try {
      await updateExperiencePreferences({
        travelerSlug: traveler.slug,
        preferredCurrency: nextCurrency,
        distanceUnit: nextDistanceUnit,
        temperatureUnit: nextTemperatureUnit,
      });
    } catch (error) {
      console.error('Failed to update preferences', error);
    }
  };

  return (
    <ProfileSettingScreen title="Experience preferences" bottomNote="Prices update across stays, bookings, and profile totals.">
      <SettingOptionGroup
        label="Currency"
        options={currencyOptions}
        value={preferredCurrency}
        onChange={(nextCurrency) => {
          setPreferredCurrency(nextCurrency);
          void savePreferences({ nextCurrency });
        }}
      />
      <SettingOptionGroup
        label="Distance"
        options={distanceOptions}
        value={distanceUnit}
        onChange={(nextDistanceUnit) => {
          setDistanceUnit(nextDistanceUnit);
          void savePreferences({ nextDistanceUnit });
        }}
      />
      <SettingOptionGroup
        label="Temperature"
        options={temperatureOptions}
        value={temperatureUnit}
        onChange={(nextTemperatureUnit) => {
          setTemperatureUnit(nextTemperatureUnit);
          void savePreferences({ nextTemperatureUnit });
        }}
      />
    </ProfileSettingScreen>
  );
}
