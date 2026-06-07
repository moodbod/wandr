import { useMutation } from 'convex/react';
import { useEffect, useMemo, useState } from 'react';

import {
  ProfileSettingScreen,
  SettingOptionGroup,
} from '@/components/wandr/profile/profile-setting-screen';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useCurrentUserSettings } from '@/hooks/use-current-user-settings';
import { updateExperiencePreferencesRef } from '@/lib/convex';
import {
  getDefaultCurrencyForCountry,
  isSupportedCurrencyCode,
  orderCurrenciesForCountry,
  type SupportedCurrencyCode,
} from '@/lib/currency';

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
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const currencyOptions = useMemo(
    () =>
      orderCurrenciesForCountry(traveler?.countryCode).map((currency) => ({
        label: currency.code,
        value: currency.code,
      })),
    [traveler?.countryCode]
  );

  useEffect(() => {
    if (!settings) {
      setPreferredCurrency(defaultCurrency);
      return;
    }

    setPreferredCurrency(isSupportedCurrencyCode(settings.preferredCurrency) ? settings.preferredCurrency : defaultCurrency);
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

    setIsSaving(true);
    setErrorText(null);
    try {
      await updateExperiencePreferences({
        travelerSlug: traveler.slug,
        preferredCurrency: nextCurrency,
        distanceUnit: nextDistanceUnit,
        temperatureUnit: nextTemperatureUnit,
      });
    } catch (error) {
      console.error('Failed to update preferences', error);
      setErrorText(error instanceof Error ? error.message : 'Could not save preferences.');
    } finally {
      setIsSaving(false);
    }
  };
  const canEdit = Boolean(traveler?.slug && settings && !isSaving);
  const bottomNote = errorText ?? (isSaving ? 'Saving...' : 'Changes save instantly.');

  return (
    <ProfileSettingScreen title="Preferences" bottomNote={bottomNote} description="Set the units and currency used across Wandr.">
      <SettingOptionGroup
        disabled={!canEdit}
        label="Currency"
        options={currencyOptions}
        value={preferredCurrency}
        onChange={(nextCurrency) => {
          setPreferredCurrency(nextCurrency);
          void savePreferences({ nextCurrency });
        }}
      />
      <SettingOptionGroup
        disabled={!canEdit}
        label="Distance"
        options={distanceOptions}
        value={distanceUnit}
        onChange={(nextDistanceUnit) => {
          setDistanceUnit(nextDistanceUnit);
          void savePreferences({ nextDistanceUnit });
        }}
      />
      <SettingOptionGroup
        disabled={!canEdit}
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
