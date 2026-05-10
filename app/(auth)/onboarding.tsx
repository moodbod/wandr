import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuthActions } from '@convex-dev/auth/react';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { type Country, type CountryCode } from 'react-native-country-picker-modal';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/themed-text';
import { AuthFormShell } from '@/components/wandr/auth/auth-form-shell';
import { AUTH_LAYOUT, createAuthPalette } from '@/components/wandr/auth/auth-palette';
import { AuthPrimaryButton } from '@/components/wandr/auth/auth-primary-button';
import { CountryPickerField } from '@/components/wandr/country-picker-field';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { completeOnboardingRef, getCurrentAuthIdentityRef } from '@/lib/convex';
import { useAuthSession } from '@/providers/auth-session';

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type TravelStyle = 'solo' | 'couple' | 'friends' | 'family';

const travelStyles: { value: TravelStyle; label: string; icon: MaterialIconName }[] = [
  { value: 'solo', label: 'Solo', icon: 'account' },
  { value: 'couple', label: 'Couple', icon: 'heart' },
  { value: 'friends', label: 'Friends', icon: 'account-group' },
  { value: 'family', label: 'Family', icon: 'home-heart' },
];

function getReturnTo(raw: unknown) {
  return typeof raw === 'string' && raw.startsWith('/') ? raw : '/(tabs)/explore';
}

function getErrorMessage(cause: unknown, fallback: string) {
  if (cause && typeof cause === 'object' && 'message' in cause && typeof (cause as { message?: unknown }).message === 'string') {
    return (cause as { message: string }).message;
  }

  return fallback;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const completeOnboarding = useMutation(completeOnboardingRef);
  const identity = useQuery(getCurrentAuthIdentityRef, {});
  const { signOut } = useAuthActions();
  const { session } = useAuthSession();
  const { width } = useWindowDimensions();
  const { isLargeScreen } = useResponsive();
  const isDark = useColorScheme() === 'dark';
  const palette = useMemo(() => createAuthPalette(isDark), [isDark]);
  const [name, setName] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode | string>('');
  const [countryLabel, setCountryLabel] = useState('');
  const [travelStyle, setTravelStyle] = useState<TravelStyle>('solo');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const returnTo = getReturnTo(params.returnTo);
  const canFinish = name.trim().length >= 2 && countryCode.length > 0 && countryLabel.length > 0;

  useEffect(() => {
    if (session) {
      router.replace(returnTo as never);
    }
  }, [returnTo, router, session]);

  useEffect(() => {
    if (identity?.name) {
      setName((current) => current || identity.name || '');
    }
  }, [identity?.name]);

  function handleSelectCountry(country: Country) {
    setCountryCode(country.cca2);
    setCountryLabel(country.name.toString());
  }

  async function handleFinish() {
    if (!canFinish) {
      setError('Enter your name.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await completeOnboarding({
        name: name.trim(),
        countryCode,
        countryLabel,
        homeCity: homeCity.trim() || undefined,
        travelStyle,
      });
      router.replace(returnTo as never);
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not save your profile.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBack() {
    await signOut();
    router.replace({ pathname: '/(auth)/sign-in', params: { returnTo } });
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.keyboardFrame, isLargeScreen && { maxWidth: AUTH_LAYOUT.desktopMaxWidth, width: Math.min(width, AUTH_LAYOUT.desktopMaxWidth) }]}>
        <AuthFormShell
          title="A few details for your trips"
          subtitle="This is the second step. It saves the traveler profile and preferences your trips use."
          palette={palette}
          footer={
            <AuthPrimaryButton
              disabled={!canFinish || isSubmitting}
              label={isSubmitting ? 'Saving...' : 'Finish'}
              loading={isSubmitting}
              palette={palette}
              onPress={handleFinish}
            />
          }
          onBack={handleBack}>
          {identity?.email ? (
            <>
              <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={styles.label}>Email</ThemedText>
              <Input
                containerStyle={[styles.input, { borderColor: palette.border }]}
                darkColor={palette.surface}
                editable={false}
                lightColor={palette.surface}
                value={identity.email}
              />
            </>
          ) : null}
          <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={styles.label}>Your name</ThemedText>
          <Input
            autoCapitalize="words"
            autoCorrect={false}
            containerStyle={[styles.input, { borderColor: palette.border }]}
            darkColor={palette.surface}
            lightColor={palette.surface}
            placeholder="Tuyoleni"
            value={name}
            onChangeText={(value) => {
              setName(value);
              setError(null);
            }}
          />
          <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={styles.label}>Country</ThemedText>
          <CountryPickerField
            accessibilityLabel={`Change country, currently ${countryLabel}`}
            countryCode={countryCode}
            label="Country"
            value={countryLabel}
            onSelect={handleSelectCountry}
          />
          <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={styles.label}>Home city</ThemedText>
          <Input
            autoCapitalize="words"
            containerStyle={[styles.input, { borderColor: palette.border }]}
            darkColor={palette.surface}
            lightColor={palette.surface}
            placeholder="Home city"
            value={homeCity}
            onChangeText={setHomeCity}
          />
          <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={styles.label}>How do you usually travel?</ThemedText>
          <View style={styles.travelGrid}>
            {travelStyles.map((item) => {
              const selected = item.value === travelStyle;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={item.value}
                  onPress={() => setTravelStyle(item.value)}
                  style={[
                    styles.travelOption,
                    {
                      backgroundColor: selected ? palette.primary : palette.surface,
                      borderColor: selected ? palette.primaryText : palette.border,
                    },
                  ]}>
                  <MaterialCommunityIcons color={palette.primaryText} name={item.icon} size={22} />
                  <ThemedText lightColor={palette.text} darkColor={palette.text} style={styles.travelLabel}>
                    {item.label}
                  </ThemedText>
                  {selected ? <MaterialCommunityIcons color={palette.primaryText} name="check" size={20} /> : null}
                </Pressable>
              );
            })}
          </View>
          {error ? <ThemedText lightColor={palette.error} darkColor={palette.error} style={styles.error}>{error}</ThemedText> : null}
        </AuthFormShell>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  error: {
    ...designSystem.type.caption,
  },
  input: {
    borderWidth: 1,
  },
  keyboardFrame: {
    alignSelf: 'center',
    flex: 1,
    width: '100%',
  },
  label: {
    ...designSystem.type.label,
  },
  safeArea: {
    flex: 1,
  },
  travelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designSystem.spacing.sm,
  },
  travelLabel: {
    ...designSystem.type.bodyStrong,
    flex: 1,
  },
  travelOption: {
    alignItems: 'center',
    borderRadius: designSystem.radii.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: designSystem.spacing.sm,
    minHeight: 58,
    paddingHorizontal: designSystem.spacing.md,
    width: '47%',
  },
});
