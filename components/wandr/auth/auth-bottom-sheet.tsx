import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useAuthActions } from '@convex-dev/auth/react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { type Country, type CountryCode } from 'react-native-country-picker-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from 'convex/react';

import { Input } from '@/components/ui/input';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { AuthFormShell } from '@/components/wandr/auth/auth-form-shell';
import { createAuthPalette } from '@/components/wandr/auth/auth-palette';
import { AuthPrimaryButton } from '@/components/wandr/auth/auth-primary-button';
import { CountryPickerField } from '@/components/wandr/country-picker-field';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { completeOnboardingRef, getCurrentAuthIdentityRef } from '@/lib/convex';

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type TravelStyle = 'solo' | 'couple' | 'friends' | 'family';

export type AuthSheetMode = 'signIn' | 'signUp' | 'onboarding';

type AuthBottomSheetProps = {
  isOpen: boolean;
  mode: AuthSheetMode;
  returnTo: string;
  onClose: () => void;
  onModeChange: (mode: AuthSheetMode) => void;
  onOnboardingBack: () => void;
};

const travelStyles: { value: TravelStyle; label: string; icon: MaterialIconName }[] = [
  { value: 'solo', label: 'Solo', icon: 'account' },
  { value: 'couple', label: 'Couple', icon: 'heart' },
  { value: 'friends', label: 'Friends', icon: 'account-group' },
  { value: 'family', label: 'Family', icon: 'home-heart' },
];

WebBrowser.maybeCompleteAuthSession();

function getErrorMessage(cause: unknown, fallback: string) {
  if (cause && typeof cause === 'object' && 'message' in cause && typeof (cause as { message?: unknown }).message === 'string') {
    const message = (cause as { message: string }).message;
    if (message.includes('InvalidAccountId') || message.includes('InvalidSecret') || message.includes('Invalid credentials')) {
      return 'Email or password does not match. Try again or create an account.';
    }
    if (message.includes('TooManyFailedAttempts')) {
      return 'Too many sign-in attempts. Wait a few minutes and try again.';
    }
    if (message.includes('Invalid `redirectTo`') || message.includes('Invalid auth redirect target')) {
      return 'Google sign-in could not return to Wandr. Try again in a moment.';
    }
    return message;
  }

  return fallback;
}

function getCodeFromUrl(url: string) {
  const code = Linking.parse(url).queryParams?.code;
  return typeof code === 'string' ? code : null;
}

function getOAuthRedirectTo(mode: Exclude<AuthSheetMode, 'onboarding'>, returnTo: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const url = new URL('/', window.location.origin);
    url.searchParams.set('authMode', mode);
    url.searchParams.set('returnTo', returnTo);
    return url.toString();
  }

  return Linking.createURL('/', {
    queryParams: {
      authMode: mode,
      returnTo,
    },
  });
}

async function completeGoogleOAuth(
  signIn: ReturnType<typeof useAuthActions>['signIn'],
  redirectTo: string
) {
  const result = await signIn('google', { redirectTo });
  if (Platform.OS === 'web') {
    return;
  }

  if (!result?.redirect) {
    return;
  }

  const authResult = await WebBrowser.openAuthSessionAsync(result.redirect.toString(), redirectTo);
  if (authResult.type !== 'success') {
    return;
  }

  const code = getCodeFromUrl(authResult.url);
  if (!code) {
    throw new Error('Google did not return an auth code.');
  }

  await (signIn as unknown as (provider: undefined, params: { code: string }) => Promise<unknown>)(undefined, { code });
}

function useIsDesktopAuthSheet() {
  const { isLargeScreen } = useResponsive();
  return Platform.OS === 'web' && isLargeScreen;
}

export function AuthBottomSheet({
  isOpen,
  mode,
  returnTo,
  onClose,
  onModeChange,
  onOnboardingBack,
}: AuthBottomSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const { isLargeScreen } = useResponsive();
  const isOnboarding = mode === 'onboarding';
  const isDesktopSheet = Platform.OS === 'web' && isLargeScreen;
  const snapPoints = useMemo(
    () => [isDesktopSheet ? '100%' : (isOnboarding ? '92%' : '84%')],
    [isDesktopSheet, isOnboarding]
  );

  const desktopModalHostStyle = useMemo(
    () => {
      if (!isDesktopSheet) return undefined;
      return styles.desktopModalHostCentered; // Center both onboarding and auth popups
    },
    [isDesktopSheet]
  );

  const desktopPopupHostStyle = useMemo(
    () => {
      if (!isDesktopSheet) return undefined;
      if (isOnboarding) {
        return {
          width: 520,
          maxWidth: '90%',
          height: 640,
          maxHeight: '85%',
          borderRadius: 24,
          overflow: 'hidden',
        };
      }
      return [styles.desktopPopupHost, { height: '84%', borderRadius: 24, overflow: 'hidden' }];
    },
    [isDesktopSheet, isOnboarding]
  );

  const desktopBackdropStyle = useMemo<ViewStyle | undefined>(
    () =>
      isDesktopSheet
        ? ({
            backgroundColor: 'rgba(14, 15, 12, 0.72)',
            backdropFilter: 'blur(8px)',
          } as any)
        : undefined,
    [isDesktopSheet]
  );

  const renderBackdrop = useMemo(
    () =>
      function AuthSheetBackdrop(props: BottomSheetBackdropProps) {
        return (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            opacity={0.32}
            pressBehavior={isOnboarding ? 'none' : 'close'}
          />
        );
      },
    [isOnboarding]
  );

  return (
    <GlassBottomSheet
      ref={sheetRef}
      index={isOpen ? 0 : -1}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={!isOnboarding}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      containerStyle={styles.sheetLayer}
      desktopModalHostStyle={desktopModalHostStyle}
      desktopPopupHostStyle={desktopPopupHostStyle}
      desktopBackdropStyle={desktopBackdropStyle}
      onClose={onClose}>
      <BottomSheetView style={[styles.sheetBody, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardFrame}>
          {mode === 'signIn' ? (
            <SignInSheetForm
              returnTo={returnTo}
              onBack={onClose}
              onClose={onClose}
              onSwitchMode={() => onModeChange('signUp')}
            />
          ) : null}
          {mode === 'signUp' ? (
            <SignUpSheetForm
              returnTo={returnTo}
              onBack={() => onModeChange('signIn')}
              onClose={onClose}
              onSwitchMode={() => onModeChange('signIn')}
            />
          ) : null}
          {mode === 'onboarding' ? (
            <OnboardingSheetForm returnTo={returnTo} onBack={onOnboardingBack} onClose={onClose} />
          ) : null}
        </KeyboardAvoidingView>
      </BottomSheetView>
    </GlassBottomSheet>
  );
}

function SignInSheetForm({
  returnTo,
  onBack,
  onClose,
  onSwitchMode,
}: {
  returnTo: string;
  onBack: () => void;
  onClose: () => void;
  onSwitchMode: () => void;
}) {
  const { signIn } = useAuthActions();
  const isDark = useColorScheme() === 'dark';
  const palette = useMemo(() => createAuthPalette(isDark), [isDark]);
  const isDesktopSheet = useIsDesktopAuthSheet();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError('Enter your email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await signIn('password', {
        email: email.trim().toLowerCase(),
        password,
        flow: 'signIn',
      });
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not sign in.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setIsSubmitting(true);
    try {
      const redirectTo = getOAuthRedirectTo('signIn', returnTo);
      await completeGoogleOAuth(signIn, redirectTo);
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not continue with Google.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthFormShell
      title="Sign in to Wandr"
      subtitle="Keep exploring, then sign in when you are ready to save trips, join groups, or message friends."
      palette={palette}
      footer={
        <AuthPrimaryButton
          disabled={isSubmitting}
          label={isSubmitting ? 'Signing in...' : 'Sign In'}
          loading={isSubmitting}
          palette={palette}
          onPress={handleSubmit}
        />
      }
      onClose={onClose}
      scrollMode="bottomSheet">
      <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={[styles.label, isDesktopSheet ? styles.desktopLabel : null]}>Email</ThemedText>
      <Input
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        containerStyle={[styles.input, isDesktopSheet ? styles.desktopInput : null]}
        keyboardType="email-address"
        lightColor={palette.inputBackground}
        darkColor={palette.inputBackground}
        style={isDesktopSheet ? styles.desktopInputText : null}
        textContentType="emailAddress"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setError(null);
        }}
      />
      <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={[styles.label, isDesktopSheet ? styles.desktopLabel : null]}>Password</ThemedText>
      <Input
        autoCapitalize="none"
        autoComplete="current-password"
        autoCorrect={false}
        containerStyle={[styles.input, isDesktopSheet ? styles.desktopInput : null]}
        darkColor={palette.inputBackground}
        lightColor={palette.inputBackground}
        secureTextEntry
        style={isDesktopSheet ? styles.desktopInputText : null}
        textContentType="password"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setError(null);
        }}
      />
      {error ? <ThemedText lightColor={palette.error} darkColor={palette.error} style={styles.error}>{error}</ThemedText> : null}
      <AuthPrimaryButton
        disabled={isSubmitting}
        label="Sign in with Google"
        palette={palette}
        variant="secondary"
        icon="google"
        onPress={handleGoogleSignIn}
      />
      <View style={styles.switchRow}>
        <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted}>New here?</ThemedText>
        <Pressable accessibilityRole="button" onPress={onSwitchMode}>
          <ThemedText lightColor={palette.primaryText} darkColor={palette.primary} style={styles.switchLink}>Create account</ThemedText>
        </Pressable>
      </View>
    </AuthFormShell>
  );
}

function SignUpSheetForm({
  returnTo,
  onBack,
  onClose,
  onSwitchMode,
}: {
  returnTo: string;
  onBack: () => void;
  onClose: () => void;
  onSwitchMode: () => void;
}) {
  const { signIn } = useAuthActions();
  const isDark = useColorScheme() === 'dark';
  const palette = useMemo(() => createAuthPalette(isDark), [isDark]);
  const isDesktopSheet = useIsDesktopAuthSheet();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError('Enter your email and password.');
      return;
    }

    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await signIn('password', {
        email: email.trim().toLowerCase(),
        password,
        flow: 'signUp',
      });
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not create your account.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignUp() {
    setError(null);
    setIsSubmitting(true);
    try {
      const redirectTo = getOAuthRedirectTo('signUp', returnTo);
      await completeGoogleOAuth(signIn, redirectTo);
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not continue with Google.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthFormShell
      title="Create your account"
      subtitle="Make a traveler profile without leaving the place you were exploring."
      palette={palette}
      footer={
        <AuthPrimaryButton
          disabled={isSubmitting}
          label={isSubmitting ? 'Creating...' : 'Create Account'}
          loading={isSubmitting}
          palette={palette}
          onPress={handleSubmit}
        />
      }
      onBack={onBack}
      onClose={onClose}
      scrollMode="bottomSheet">
      <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={[styles.label, isDesktopSheet ? styles.desktopLabel : null]}>Email</ThemedText>
      <Input
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        containerStyle={[styles.input, isDesktopSheet ? styles.desktopInput : null]}
        keyboardType="email-address"
        lightColor={palette.inputBackground}
        darkColor={palette.inputBackground}
        style={isDesktopSheet ? styles.desktopInputText : null}
        textContentType="emailAddress"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setError(null);
        }}
      />
      <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={[styles.label, isDesktopSheet ? styles.desktopLabel : null]}>Password</ThemedText>
      <Input
        autoCapitalize="none"
        autoComplete="new-password"
        autoCorrect={false}
        containerStyle={[styles.input, isDesktopSheet ? styles.desktopInput : null]}
        darkColor={palette.inputBackground}
        lightColor={palette.inputBackground}
        secureTextEntry
        style={isDesktopSheet ? styles.desktopInputText : null}
        textContentType="newPassword"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setError(null);
        }}
      />
      {error ? <ThemedText lightColor={palette.error} darkColor={palette.error} style={styles.error}>{error}</ThemedText> : null}
      <AuthPrimaryButton
        disabled={isSubmitting}
        label="Sign up with Google"
        palette={palette}
        variant="secondary"
        icon="google"
        onPress={handleGoogleSignUp}
      />
      <View style={styles.switchRow}>
        <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted}>Already have one?</ThemedText>
        <Pressable accessibilityRole="button" onPress={onSwitchMode}>
          <ThemedText lightColor={palette.primaryText} darkColor={palette.primary} style={styles.switchLink}>Sign in</ThemedText>
        </Pressable>
      </View>
    </AuthFormShell>
  );
}

function OnboardingSheetForm({
  onBack,
  onClose,
}: {
  returnTo: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const completeOnboarding = useMutation(completeOnboardingRef);
  const identity = useQuery(getCurrentAuthIdentityRef, {});
  const { signOut } = useAuthActions();
  const isDark = useColorScheme() === 'dark';
  const palette = useMemo(() => createAuthPalette(isDark), [isDark]);
  const isDesktopSheet = useIsDesktopAuthSheet();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode | string>('');
  const [countryLabel, setCountryLabel] = useState('');
  const [travelStyle, setTravelStyle] = useState<TravelStyle>('solo');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canFinish = name.trim().length >= 2 && countryCode.length > 0 && countryLabel.length > 0;

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
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not save your profile.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBack() {
    if (step === 2) {
      setStep(1);
    } else {
      await signOut();
      onBack();
    }
  }

  async function handleCancelOnboarding() {
    await signOut();
    onClose();
  }

  const stepTitle = step === 2 ? "How do you usually travel?" : "Welcome to Wandr";

  const stepSubtitle = step === 2
    ? "Choose the style that fits you best. We'll use this to customize your recommendations."
    : "A few details to personalize your traveler profile.";

  const stepFooter = step === 1 ? (
    <AuthPrimaryButton
      disabled={!canFinish}
      label="Continue"
      palette={palette}
      onPress={() => setStep(2)}
    />
  ) : (
    <AuthPrimaryButton
      disabled={!canFinish || isSubmitting}
      label={isSubmitting ? 'Saving...' : 'Finish'}
      loading={isSubmitting}
      palette={palette}
      onPress={handleFinish}
    />
  );

  return (
    <AuthFormShell
      title={stepTitle}
      subtitle={stepSubtitle}
      palette={palette}
      footer={stepFooter}
      onBack={step === 2 ? handleBack : undefined}
      onClose={handleCancelOnboarding}
      scrollMode="bottomSheet">



      {step === 1 ? (
        <>
          <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={[styles.label, isDesktopSheet ? styles.desktopLabel : null]}>Your name</ThemedText>
          <Input
            autoCapitalize="words"
            autoCorrect={false}
            containerStyle={[styles.input, isDesktopSheet ? styles.desktopInput : null]}
            darkColor={palette.inputBackground}
            lightColor={palette.inputBackground}
            placeholder="Tuyoleni"
            style={isDesktopSheet ? styles.desktopInputText : null}
            value={name}
            onChangeText={(value) => {
              setName(value);
              setError(null);
            }}
          />
          <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={styles.desktopHelperText}>
            First name or nickname. Letters, numbers, spaces only.
          </ThemedText>
          <CountryPickerField
            accessibilityLabel={`Change country, currently ${countryLabel}`}
            countryCode={countryCode}
            label="Country"
            value={countryLabel}
            onSelect={handleSelectCountry}
          />
          <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={[styles.label, isDesktopSheet ? styles.desktopLabel : null]}>Home city</ThemedText>
          <Input
            autoCapitalize="words"
            containerStyle={[styles.input, isDesktopSheet ? styles.desktopInput : null]}
            darkColor={palette.inputBackground}
            lightColor={palette.inputBackground}
            placeholder="Home city"
            style={isDesktopSheet ? styles.desktopInputText : null}
            value={homeCity}
            onChangeText={setHomeCity}
          />
          <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={styles.desktopHelperText}>
            Where you spend most of your time.
          </ThemedText>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <ThemedText lightColor={palette.textMuted} darkColor={palette.textMuted} style={[styles.label, isDesktopSheet ? styles.desktopLabel : null]}>How do you usually travel?</ThemedText>
          <View style={styles.travelGrid}>
            {travelStyles.map((item) => {
              const selected = item.value === travelStyle;
              const iconColor = selected ? palette.primaryText : (isDark ? palette.text : palette.textMuted);
              const textColor = selected ? palette.primaryText : palette.text;
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
                  <MaterialCommunityIcons color={iconColor} name={item.icon} size={20} />
                  <ThemedText lightColor={textColor} darkColor={textColor} style={styles.travelLabel}>
                    {item.label}
                  </ThemedText>
                  {selected ? <MaterialCommunityIcons color={palette.primaryText} name="check" size={20} /> : null}
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
      {error ? <ThemedText lightColor={palette.error} darkColor={palette.error} style={styles.error}>{error}</ThemedText> : null}
    </AuthFormShell>
  );
}

const styles = StyleSheet.create({
  error: {
    ...designSystem.type.caption,
  },
  input: {
    borderWidth: 0,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: designSystem.spacing.md,
  },
  desktopInput: {
    height: 48,
    paddingHorizontal: designSystem.spacing.md,
    borderRadius: 12,
  },
  desktopInputText: {
    fontSize: 15,
    height: 20,
    lineHeight: 20,
  },
  desktopHelperText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: -designSystem.spacing.xs,
    marginBottom: designSystem.spacing.sm,
  },
  desktopPopupHost: {
    maxHeight: '100%',
  },
  desktopLabel: {
    fontSize: 12,
    lineHeight: 15,
  },
  keyboardFrame: {
    flex: 1,
  },
  label: {
    ...designSystem.type.label,
  },
  sheetBody: {
    flex: 1,
  },
  sheetLayer: {
    elevation: 2000,
    zIndex: 2000,
  },
  switchLink: {
    ...designSystem.type.bodyStrong,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: designSystem.spacing.xs,
    justifyContent: 'center',
    marginTop: designSystem.spacing.md,
  },
  travelGrid: {
    flexDirection: 'column',
    gap: designSystem.spacing.xs,
  },
  desktopTravelGrid: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    gap: designSystem.spacing.xs,
  },
  travelLabel: {
    ...designSystem.type.bodyStrong,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
  },
  travelOption: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 0,
    flexDirection: 'row',
    gap: designSystem.spacing.sm,
    minHeight: 48,
    paddingHorizontal: designSystem.spacing.md,
    width: '100%',
    justifyContent: 'flex-start',
  },
  desktopTravelOption: {
    borderRadius: 12,
    borderWidth: 0,
    gap: designSystem.spacing.sm,
    minHeight: 48,
    paddingHorizontal: designSystem.spacing.md,
    width: '100%',
    justifyContent: 'flex-start',
  },
  desktopModalHostCentered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
});
