import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuthActions } from '@convex-dev/auth/react';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { type Country, type CountryCode } from 'react-native-country-picker-modal';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CountryPickerField } from '@/components/wandr/country-picker-field';
import { GlassButton } from '@/components/ui/glass-button';
import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { completeProfileOnboardingRef, getCurrentAuthIdentityRef } from '@/lib/convex';
import { useAuthSession } from '@/providers/auth-session';

WebBrowser.maybeCompleteAuthSession();

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type IntroSlide = { icon: MaterialIconName; title: string; body: string };
type TravelStyleOption = { value: 'solo' | 'couple' | 'friends' | 'family'; label: string; icon: MaterialIconName };
type FlowStep = 'intro' | 'auth' | 'profile' | 'done';
type TravelStyle = (typeof travelStyles)[number]['value'];

const introSlides: IntroSlide[] = [
  {
    icon: 'map-marker-path',
    title: 'PLAN THE ROUTE, NOT JUST THE PIN',
    body: 'Build trips around stays, hidden gems, friends, and what is actually close enough to enjoy.',
  },
  {
    icon: 'account-group',
    title: 'TRAVEL WITH YOUR PEOPLE',
    body: 'Match with friends, plan in circles, and keep chats tied to the places you are choosing.',
  },
  {
    icon: 'compass-rose',
    title: 'WONDER YOUR WAY INTO THE NEXT TRIP',
    body: 'Wandr is for the curious bit before you go: the places you keep thinking about, the routes you might take, and the trip that starts forming from there.',
  },
];

const travelStyles: TravelStyleOption[] = [
  { value: 'solo', label: 'Solo', icon: 'account' },
  { value: 'couple', label: 'Couple', icon: 'heart' },
  { value: 'friends', label: 'Friends', icon: 'account-group' },
  { value: 'family', label: 'Family', icon: 'home-heart' },
] as const;

const AUTH_LAYOUT = {
  artIconSize: 108,
  artSize: 180,
  artRotation: '6deg',
  artOrbOpacity: 0.68,
  artOrbRotation: '-12deg',
  artOrbSize: '92%',
  artStageMaxWidth: 360,
  backButtonSize: 44,
  checkIconSize: 112,
  desktopMaxWidth: 560,
  doneCheckRadius: 42,
  doneCheckRotation: '-10deg',
  doneCheckSize: 190,
  disabledOpacity: 0.45,
  formTitleFontSize: 31,
  iconSize: 24,
  iconSizeMd: 22,
  introCopyMaxWidth: 320,
  introSlideHorizontalPadding: designSystem.spacing.xl,
  primaryButtonHeight: designSystem.layout.inputHeight + designSystem.spacing.xs / 2,
  progressHeight: 5,
  skipButtonHeight: 42,
  skipButtonWidth: 76,
  travelStyleWidth: '47%',
} as const;

function createAuthPalette(isDark: boolean) {
  return {
    background: isDark ? designSystem.semantic.dark.background : designSystem.semantic.light.background,
    surface: isDark ? designSystem.semantic.dark.surfaceRaised : designSystem.colors.white,
    text: isDark ? designSystem.semantic.dark.text : designSystem.semantic.light.text,
    textMuted: isDark ? designSystem.semantic.dark.textMuted : designSystem.semantic.light.textMuted,
    border: isDark ? designSystem.semantic.dark.borderSoft : designSystem.semantic.light.border,
    borderStrong: isDark ? designSystem.colors.lime : designSystem.colors.darkGreen,
    placeholder: isDark ? designSystem.semantic.dark.placeholder : designSystem.semantic.light.placeholder,
    primary: designSystem.colors.lime,
    primaryText: designSystem.colors.darkGreen,
    error: designSystem.colors.liked,
  };
}

export default function AuthScreen() {
  const completeOnboarding = useMutation(completeProfileOnboardingRef);
  const { signIn, signOut } = useAuthActions();
  const { session } = useAuthSession();
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const authIdentity = useQuery(getCurrentAuthIdentityRef, session ? 'skip' : {});
  const { width } = useWindowDimensions();
  const { isLargeScreen } = useResponsive();
  const isDark = useColorScheme() === 'dark';
  const palette = useMemo(() => createAuthPalette(isDark), [isDark]);
  const [step, setStep] = useState<FlowStep>('intro');
  const [slideIndex, setSlideIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>('NA');
  const [countryLabel, setCountryLabel] = useState('Namibia');
  const [travelStyle, setTravelStyle] = useState<TravelStyle>('solo');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signInInFlightRef = useRef(false);

  const shouldConstrainAuthWidth = isLargeScreen;
  const authFrameWidth = shouldConstrainAuthWidth ? Math.min(width, AUTH_LAYOUT.desktopMaxWidth) : width;
  const canContinueProfile = name.trim().length >= 2;
  const returnTo = useMemo(() => {
    const rawReturnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
    return rawReturnTo?.startsWith('/') && rawReturnTo !== '/(auth)' ? rawReturnTo : undefined;
  }, [params.returnTo]);

  useEffect(() => {
    if (session) {
      setStep('done');
      return;
    }

    if (authIdentity) {
      setEmail(authIdentity.email ?? '');
      setName((current) => current || authIdentity.name || '');
      setStep('profile');
      return;
    }

    setStep((current) => (current === 'done' ? 'auth' : current === 'profile' ? 'auth' : current));
  }, [authIdentity, session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    router.replace((returnTo ?? '/(tabs)/explore') as never);
  }, [returnTo, router, session]);

  function getErrorMessage(cause: unknown, fallback: string) {
    if (cause && typeof cause === 'object' && 'message' in cause && typeof (cause as { message?: unknown }).message === 'string') {
      return (cause as { message: string }).message;
    }

    return fallback;
  }

  function handleIntroNext() {
    if (slideIndex < introSlides.length - 1) {
      setSlideIndex((current) => current + 1);
      return;
    }

    setStep('auth');
  }

  async function handleGoogleSignIn() {
    if (signInInFlightRef.current) {
      return;
    }

    signInInFlightRef.current = true;
    setError(null);
    setIsSubmitting(true);

    try {
      const redirectTo = getOAuthRedirectTo(returnTo);
      const result = await signIn('google', { redirectTo });

      if (result.redirect && Platform.OS !== 'web') {
        const authResult = await WebBrowser.openAuthSessionAsync(result.redirect.toString(), redirectTo);

        if (authResult.type !== 'success') {
          return;
        }

        const code = getCodeFromUrl(authResult.url);
        if (!code) {
          throw new Error('Google did not return an auth code.');
        }

        await signInWithCode(signIn, code);
      }
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not sign in with Google.'));
    } finally {
      signInInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleFinish() {
    if (!canContinueProfile) {
      setError('Add your name.');
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
      setStep('done');
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not finish onboarding.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBackFromProfile() {
    setError(null);
    await signOut();
    setStep('auth');
  }

  function handleSelectCountry(country: Country) {
    setCountryCode(country.cca2);
    setCountryLabel(typeof country.name === 'string' ? country.name : country.name.common);
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.keyboardFrame, shouldConstrainAuthWidth && styles.maxWidthFrame]}>
        {step === 'intro' ? (
          <IntroStep
            palette={palette}
            slideIndex={slideIndex}
            width={authFrameWidth}
            onBack={() => setSlideIndex((current) => Math.max(current - 1, 0))}
            onNext={handleIntroNext}
            onSlideChange={setSlideIndex}
            onSkip={() => setStep('auth')}
          />
        ) : null}

        {step === 'auth' ? (
          <FormShell
            title="Sign in to Wandr"
            subtitle="Use your Google account to continue."
            footer={
              <PrimaryButton
                disabled={isSubmitting}
                iconName="google"
                label={isSubmitting ? 'Opening Google...' : 'Continue with Google'}
                loading={isSubmitting}
                palette={palette}
                onPress={handleGoogleSignIn}
              />
            }
            onBack={() => setStep('intro')}
            palette={palette}>
            {error ? (
              <ThemedText lightColor={palette.error} darkColor={palette.error} style={styles.errorText}>
                {error}
              </ThemedText>
            ) : null}
          </FormShell>
        ) : null}

        {step === 'profile' ? (
          <FormShell
            title="A few details for your trips"
            subtitle="This keeps your traveler profile, stays, and friend matching useful."
            footer={
              <PrimaryButton
                disabled={!canContinueProfile || isSubmitting}
                label={isSubmitting ? 'Saving...' : 'Finish'}
                loading={isSubmitting}
                palette={palette}
                onPress={handleFinish}
              />
            }
            onBack={() => {
              void handleBackFromProfile();
            }}
            palette={palette}>
              <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.fieldLabel}>
                Email
              </ThemedText>
              <Input containerStyle={styles.authInputContainer} editable={false} placeholder="Google account email" value={email} />

              <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.fieldLabel}>
                Your name
              </ThemedText>
              <Input
                autoCapitalize="words"
                autoComplete="off"
                autoCorrect={false}
                containerStyle={styles.authInputContainer}
                importantForAutofill="no"
                placeholder="Tuyoleni"
                textContentType="none"
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  setError(null);
                }}
              />

              <CountryPickerField
                accessibilityLabel="Select home country"
                countryCode={countryCode}
                label="Home country"
                value={countryLabel}
                onSelect={handleSelectCountry}
              />

              <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.fieldLabel}>
                Home city
              </ThemedText>
              <Input
                autoCapitalize="words"
                containerStyle={styles.authInputContainer}
                placeholder="Windhoek"
                value={homeCity}
                onChangeText={setHomeCity}
              />

              <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.fieldLabel}>
                How do you usually travel?
              </ThemedText>
              <View style={styles.travelStyleGrid}>
                {travelStyles.map((item) => {
                  const selected = travelStyle === item.value;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={item.value}
                      style={[
                        styles.travelStyleBox,
                        {
                          backgroundColor: selected
                            ? isDark
                              ? designSystem.colors.darkSurface
                              : designSystem.colors.limeMist
                            : isDark
                              ? designSystem.colors.darkSurfaceOverlay
                              : designSystem.colors.surface,
                          borderColor: designSystem.colors.borderFaint,
                        },
                      ]}
                      onPress={() => setTravelStyle(item.value)}>
                      <View style={styles.travelStyleBoxContent}>
                        <MaterialCommunityIcons color={palette.borderStrong} name={item.icon} size={AUTH_LAYOUT.iconSizeMd} />
                        <ThemedText lightColor={designSystem.colors.ink} darkColor={designSystem.colors.darkText} style={styles.travelStyleLabel}>
                          {item.label}
                        </ThemedText>
                      </View>
                      {selected ? <MaterialCommunityIcons color={palette.borderStrong} name="check" size={AUTH_LAYOUT.iconSizeMd} /> : null}
                    </Pressable>
                  );
                })}
              </View>

              {error ? (
                <ThemedText lightColor={palette.error} darkColor={palette.error} style={styles.errorText}>
                  {error}
                </ThemedText>
              ) : null}
          </FormShell>
        ) : null}

        {step === 'done' ? <DoneStep palette={palette} /> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function IntroStep({
  palette,
  slideIndex,
  width,
  onBack,
  onNext,
  onSlideChange,
  onSkip,
}: {
  palette: ReturnType<typeof createAuthPalette>;
  slideIndex: number;
  width: number;
  onBack: () => void;
  onNext: () => void;
  onSlideChange: (index: number) => void;
  onSkip: () => void;
}) {
  const slide = introSlides[slideIndex];

  return (
    <View style={styles.introFrame}>
      <View style={styles.progressRow}>
        {introSlides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressTrack,
              { backgroundColor: palette.border },
              index <= slideIndex && { backgroundColor: palette.borderStrong },
            ]}
          />
        ))}
      </View>

      <View style={styles.introTopControls}>
        {slideIndex > 0 ? (
          <GlassButton accessibilityLabel="Go back to previous onboarding intro" height={AUTH_LAYOUT.backButtonSize} width={AUTH_LAYOUT.backButtonSize} onPress={onBack}>
            <MaterialCommunityIcons color={palette.borderStrong} name="arrow-left" size={AUTH_LAYOUT.iconSize} />
          </GlassButton>
        ) : (
          <View style={styles.introControlSpacer} />
        )}
        <Pressable accessibilityRole="button" accessibilityLabel="Skip onboarding intro" style={({ pressed }) => [styles.skipButton, { backgroundColor: palette.primary }, pressed && styles.filledButtonPressed]} onPress={onSkip}>
          <ThemedText lightColor={palette.primaryText} darkColor={palette.primaryText} style={styles.skipText}>
            Skip
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.introPage}>
        <View style={[styles.artStage, { width: Math.min(width - designSystem.spacing.xxl * 2, AUTH_LAYOUT.artStageMaxWidth) }]}>
          <LinearGradient colors={['#9fe870', '#f8e67a', '#78d6ff']} start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }} style={styles.artOrb} />
          <View style={[styles.artIconShell, { backgroundColor: palette.surface }]}>
            <MaterialCommunityIcons color={palette.borderStrong} name={slide.icon} size={AUTH_LAYOUT.artIconSize} />
          </View>
        </View>

        <View style={styles.introCopy}>
          <ThemedText lightColor={designSystem.colors.ink} darkColor={designSystem.colors.darkText} style={styles.introTitle}>
            {slide.title}
          </ThemedText>
          <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.introBody}>
            {slide.body}
          </ThemedText>
        </View>
      </View>

      <View style={styles.introFooter}>
        <View style={styles.slideDots}>
          {introSlides.map((_, index) => (
            <Pressable key={index} accessibilityRole="button" onPress={() => onSlideChange(index)} style={[styles.slideDot, { backgroundColor: index === slideIndex ? palette.borderStrong : palette.border }]} />
          ))}
        </View>
        <PrimaryButton label={slideIndex === introSlides.length - 1 ? 'Get started' : 'Next'} palette={palette} onPress={onNext} />
      </View>
    </View>
  );
}

function FormShell({
  children,
  footer,
  onBack,
  palette,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  footer: ReactNode;
  onBack: () => void;
  palette: ReturnType<typeof createAuthPalette>;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.formFrame}>
      <View style={styles.formHeader}>
        <GlassButton accessibilityLabel="Go back" height={AUTH_LAYOUT.backButtonSize} width={AUTH_LAYOUT.backButtonSize} onPress={onBack}>
          <MaterialCommunityIcons color={palette.borderStrong} name="arrow-left" size={AUTH_LAYOUT.iconSize} />
        </GlassButton>
      </View>
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <ThemedText lightColor={designSystem.colors.ink} darkColor={designSystem.colors.darkText} style={styles.formTitle}>
          {title}
        </ThemedText>
        <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.formSubtitle}>
          {subtitle}
        </ThemedText>
        <View style={styles.formFields}>{children}</View>
      </ScrollView>
      <View style={[styles.footer, { borderColor: palette.border }]}>{footer}</View>
    </View>
  );
}

function PrimaryButton({
  disabled,
  iconName,
  label,
  loading,
  palette,
  onPress,
}: {
  disabled?: boolean;
  iconName?: MaterialIconName;
  label: string;
  loading?: boolean;
  palette: ReturnType<typeof createAuthPalette>;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: palette.primary },
        disabled && styles.primaryButtonDisabled,
        pressed && styles.filledButtonPressed,
      ]}
      onPress={onPress}>
      {loading ? (
        <ActivityIndicator color={palette.primaryText} />
      ) : (
        <View style={styles.primaryButtonContent}>
          {iconName ? <MaterialCommunityIcons color={palette.primaryText} name={iconName} size={AUTH_LAYOUT.iconSizeMd} /> : null}
          <ThemedText lightColor={palette.primaryText} darkColor={palette.primaryText} style={styles.primaryButtonText}>
            {label}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

function getOAuthRedirectTo(returnTo?: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.href;
  }

  return Linking.createURL(returnTo ? `/(auth)?returnTo=${encodeURIComponent(returnTo)}` : '/(auth)');
}

function getCodeFromUrl(url: string) {
  try {
    return new URL(url).searchParams.get('code');
  } catch {
    const [, queryString = ''] = url.split('?');
    return new URLSearchParams(queryString).get('code');
  }
}

async function signInWithCode(
  signIn: ReturnType<typeof useAuthActions>['signIn'],
  code: string
) {
  await (signIn as unknown as (provider: undefined, params: { code: string }) => Promise<unknown>)(undefined, { code });
}

function DoneStep({ palette }: { palette: ReturnType<typeof createAuthPalette> }) {
  return (
    <View style={[styles.doneFrame, { backgroundColor: palette.background }]}>
      <View style={styles.doneCheck}>
        <MaterialCommunityIcons color={palette.primaryText} name="check-bold" size={AUTH_LAYOUT.checkIconSize} />
      </View>
      <ThemedText lightColor={designSystem.colors.lime} darkColor={designSystem.colors.lime} style={styles.doneTitle}>
        ALL DONE!
      </ThemedText>
      <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.doneBody}>
        You are ready to start planning with Wandr.
      </ThemedText>
      <ActivityIndicator color={designSystem.colors.lime} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: designSystem.colors.background,
    flex: 1,
  },
  keyboardFrame: {
    flex: 1,
  },
  maxWidthFrame: {
    alignSelf: 'center',
    maxWidth: AUTH_LAYOUT.desktopMaxWidth,
    width: '100%',
  },
  introFrame: {
    flex: 1,
    gap: designSystem.spacing.xl,
    justifyContent: 'space-between',
    padding: designSystem.spacing.xl,
  },
  progressRow: {
    flexDirection: 'row',
    gap: designSystem.spacing.xs,
    paddingTop: designSystem.spacing.xs,
  },
  progressTrack: {
    borderRadius: designSystem.radii.pill,
    flex: 1,
    height: AUTH_LAYOUT.progressHeight,
  },
  introTopControls: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  introControlSpacer: {
    height: AUTH_LAYOUT.backButtonSize,
    width: AUTH_LAYOUT.backButtonSize,
  },
  introPage: {
    alignItems: 'center',
    flex: 1,
    gap: designSystem.layout.sectionGap + designSystem.spacing.xxs / 2,
    justifyContent: 'center',
    paddingHorizontal: AUTH_LAYOUT.introSlideHorizontalPadding,
  },
  artStage: {
    alignItems: 'center',
    alignSelf: 'center',
    aspectRatio: 1,
    justifyContent: 'center',
  },
  artOrb: {
    borderRadius: AUTH_LAYOUT.artSize,
    height: AUTH_LAYOUT.artOrbSize,
    opacity: AUTH_LAYOUT.artOrbOpacity,
    position: 'absolute',
    transform: [{ rotate: AUTH_LAYOUT.artOrbRotation }],
    width: AUTH_LAYOUT.artOrbSize,
  },
  artIconShell: {
    alignItems: 'center',
    borderRadius: designSystem.radii.sheet - designSystem.spacing.xxs / 2,
    height: AUTH_LAYOUT.artSize,
    justifyContent: 'center',
    transform: [{ rotate: AUTH_LAYOUT.artRotation }],
    width: AUTH_LAYOUT.artSize,
  },
  introCopy: {
    alignItems: 'center',
    gap: designSystem.layout.compactPadding,
  },
  introTitle: {
    fontSize: designSystem.type.pageTitle.fontSize,
    fontWeight: '600',
    lineHeight: designSystem.type.pageTitle.lineHeight,
    textAlign: 'center',
  },
  introBody: {
    ...designSystem.type.body,
    maxWidth: AUTH_LAYOUT.introCopyMaxWidth,
    textAlign: 'center',
  },
  introFooter: {
    gap: designSystem.spacing.lg,
  },
  slideDots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: designSystem.spacing.xs,
    justifyContent: 'center',
  },
  slideDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  formFrame: {
    flex: 1,
  },
  formHeader: {
    paddingHorizontal: designSystem.spacing.lg,
    paddingTop: designSystem.spacing.xs + designSystem.spacing.xxs / 2,
  },
  formContent: {
    paddingBottom: designSystem.spacing.xxl,
    paddingHorizontal: designSystem.spacing.xl,
    paddingTop: designSystem.spacing.xxl,
  },
  formTitle: {
    fontSize: AUTH_LAYOUT.formTitleFontSize,
    fontWeight: '600',
    lineHeight: designSystem.type.pageTitle.lineHeight,
  },
  formSubtitle: {
    ...designSystem.type.body,
    marginTop: designSystem.layout.compactPadding,
  },
  formFields: {
    gap: designSystem.spacing.sm,
    marginTop: designSystem.radii.sheet - designSystem.spacing.xxs / 2,
  },
  fieldLabel: {
    ...designSystem.type.label,
    marginTop: designSystem.spacing.xs,
  },
  authInputContainer: {
    borderColor: designSystem.colors.border,
    borderWidth: 1,
  },
  travelStyleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designSystem.spacing.xs + designSystem.spacing.xxs / 2,
  },
  travelStyleBox: {
    alignItems: 'center',
    borderRadius: designSystem.radii.card,
    borderWidth: 1,
    flexBasis: AUTH_LAYOUT.travelStyleWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: designSystem.layout.inputHeight + designSystem.spacing.md,
    paddingHorizontal: designSystem.layout.compactPadding,
  },
  travelStyleBoxContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: designSystem.spacing.xs + designSystem.spacing.xxs / 2,
  },
  travelStyleLabel: {
    ...designSystem.type.bodyStrong,
  },
  errorText: {
    ...designSystem.type.bodySmallStrong,
    color: designSystem.colors.liked,
  },
  footer: {
    borderTopWidth: 1,
    padding: designSystem.spacing.lg,
  },
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: designSystem.radii.pill,
    justifyContent: 'center',
    minHeight: AUTH_LAYOUT.primaryButtonHeight,
    paddingHorizontal: designSystem.spacing.lg,
    width: '100%',
  },
  primaryButtonDisabled: {
    opacity: AUTH_LAYOUT.disabledOpacity,
  },
  primaryButtonText: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.darkGreen,
  },
  primaryButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: designSystem.spacing.xs,
    justifyContent: 'center',
  },
  filledButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  skipButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    borderRadius: designSystem.radii.pill,
    justifyContent: 'center',
    minHeight: AUTH_LAYOUT.skipButtonHeight,
    minWidth: AUTH_LAYOUT.skipButtonWidth,
    paddingHorizontal: designSystem.spacing.md,
  },
  skipText: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.darkGreen,
  },
  doneFrame: {
    alignItems: 'center',
    flex: 1,
    gap: designSystem.spacing.xl - designSystem.spacing.xxs / 2,
    justifyContent: 'center',
    padding: designSystem.spacing.xxl,
  },
  doneCheck: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.lime,
    borderRadius: AUTH_LAYOUT.doneCheckRadius,
    height: AUTH_LAYOUT.doneCheckSize,
    justifyContent: 'center',
    transform: [{ rotate: AUTH_LAYOUT.doneCheckRotation }],
    width: AUTH_LAYOUT.doneCheckSize,
  },
  doneTitle: {
    color: designSystem.colors.lime,
    fontSize: designSystem.type.display.fontSize,
    fontWeight: '600',
    lineHeight: designSystem.type.display.lineHeight,
    textAlign: 'center',
  },
  doneBody: {
    ...designSystem.type.body,
    textAlign: 'center',
  },
});
