import { useAuthActions } from '@convex-dev/auth/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/ui/input';
import { AuthFormShell } from '@/components/wandr/auth/auth-form-shell';
import { AUTH_LAYOUT, createAuthPalette } from '@/components/wandr/auth/auth-palette';
import { AuthPrimaryButton } from '@/components/wandr/auth/auth-primary-button';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { useAuthSession } from '@/providers/auth-session';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { signIn } = useAuthActions();
  const { session } = useAuthSession();
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const { isLargeScreen } = useResponsive();
  const isDark = useColorScheme() === 'dark';
  const palette = useMemo(() => createAuthPalette(isDark), [isDark]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signInInFlightRef = useRef(false);

  const shouldConstrainAuthWidth = isLargeScreen;
  const returnTo = useMemo(() => {
    const rawReturnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
    if (rawReturnTo?.startsWith('/') && rawReturnTo !== '/sign-in' && rawReturnTo !== '/(auth)') {
      return rawReturnTo;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('wandr:auth:returnTo');
        if (stored?.startsWith('/') && stored !== '/sign-in') {
          return stored;
        }
      } catch {}
    }
    return undefined;
  }, [params.returnTo]);

  useEffect(() => {
    if (session) {
      if (Platform.OS === 'web') {
        try { sessionStorage.removeItem('wandr:auth:returnTo'); } catch {}
      }
      router.replace((returnTo ?? '/(tabs)/explore') as never);
    }
  }, [returnTo, router, session]);

  const oauthCodeHandled = useRef(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const { isAuthenticated, session } = useAuthSession();
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (!code || oauthCodeHandled.current || isAuthenticated || session) {
      return;
    }

    oauthCodeHandled.current = true;
    if (typeof document !== 'undefined') document.title = 'Verifying... | Wandr';
    url.searchParams.delete('code');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);

    setIsSubmitting(true);
    setError(null);

    void (async () => {
      try {
        await signIn(undefined as unknown as string, { code });
      } catch (cause) {
        console.error('[wandr] OAuth code exchange failed:', cause);
        setError('Sign in failed. Please try again.');
        oauthCodeHandled.current = false;
      } finally {
        setIsSubmitting(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getErrorMessage(cause: unknown, fallback: string) {
    if (cause && typeof cause === 'object' && 'message' in cause && typeof (cause as { message?: unknown }).message === 'string') {
      return (cause as { message: string }).message;
    }
    return fallback;
  }

  function getOAuthRedirectTo(returnToUrl?: string) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const cleanUrl = window.location.origin + window.location.pathname;
      if (returnToUrl) {
        try { sessionStorage.setItem('wandr:auth:returnTo', returnToUrl); } catch {}
      }
      return cleanUrl;
    }
    return Linking.createURL(returnToUrl ? `sign-in?returnTo=${encodeURIComponent(returnToUrl)}` : 'sign-in');
  }

  function getCodeFromUrl(url: string) {
    try {
      return new URL(url).searchParams.get('code');
    } catch {
      const [, queryString = ''] = url.split('?');
      return new URLSearchParams(queryString).get('code');
    }
  }

  async function handleGoogleSignIn() {
    if (signInInFlightRef.current) return;
    signInInFlightRef.current = true;
    setError(null);
    setIsSubmitting(true);

    try {
      const redirectTo = getOAuthRedirectTo(returnTo);
      const result = await signIn('google', { redirectTo });

      if (result.redirect && Platform.OS !== 'web') {
        const authResult = await WebBrowser.openAuthSessionAsync(result.redirect.toString(), redirectTo);
        if (authResult.type !== 'success') return;

        const code = getCodeFromUrl(authResult.url);
        if (!code) throw new Error('Google did not return an auth code.');

        await (signIn as unknown as (provider: undefined, params: { code: string }) => Promise<unknown>)(undefined, { code });
      }
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not sign in with Google.'));
    } finally {
      signInInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handlePasswordSignIn() {
    if (signInInFlightRef.current) return;
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    signInInFlightRef.current = true;
    setError(null);
    setIsSubmitting(true);

    try {
      await signIn('password', { email, password, flow: 'signIn' });
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not sign in. Please check your credentials.'));
    } finally {
      signInInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.keyboardFrame, shouldConstrainAuthWidth && styles.maxWidthFrame]}>
        <AuthFormShell
          title="Sign in to Wandr"
          subtitle="Use your email or Google account to save, book, chat, and plan with friends."
          footer={
            <View style={{ gap: designSystem.spacing.sm }}>
              <AuthPrimaryButton
                disabled={isSubmitting}
                iconName="email"
                label={isSubmitting ? 'Authenticating...' : 'Sign in with Email'}
                loading={isSubmitting}
                palette={palette}
                onPress={handlePasswordSignIn}
              />
              <AuthPrimaryButton
                disabled={isSubmitting}
                iconName="google"
                label={isSubmitting ? 'Opening Google...' : 'Continue with Google'}
                loading={isSubmitting}
                palette={palette}
                onPress={handleGoogleSignIn}
              />
            </View>
          }
          onBack={() => router.replace('/explore')}
          palette={palette}>
          
          <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.fieldLabel}>
            Email
          </ThemedText>
          <Input
            autoCapitalize="none"
            autoComplete="email"
            containerStyle={styles.authInputContainer}
            keyboardType="email-address"
            placeholder="name@example.com"
            value={email}
            onChangeText={(val) => { setEmail(val); setError(null); }}
          />

          <ThemedText lightColor={designSystem.colors.warmDark} darkColor={designSystem.colors.darkMutedText} style={styles.fieldLabel}>
            Password
          </ThemedText>
          <Input
            autoCapitalize="none"
            autoComplete="password"
            containerStyle={styles.authInputContainer}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={(val) => { setPassword(val); setError(null); }}
          />

          <Pressable
            style={{ marginTop: designSystem.spacing.sm, alignSelf: 'flex-start' }}
            onPress={() => {
              router.push({
                pathname: '/(auth)/sign-up' as never,
                params: { returnTo: returnTo || '' },
              });
            }}>
            <ThemedText lightColor={palette.primaryText} darkColor={palette.primaryText} style={{ ...designSystem.type.bodyStrong }}>
              Don't have an account? Sign up
            </ThemedText>
          </Pressable>

          {error ? (
            <ThemedText lightColor={palette.error} darkColor={palette.error} style={styles.errorText}>
              {error}
            </ThemedText>
          ) : null}
        </AuthFormShell>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  fieldLabel: {
    ...designSystem.type.label,
    marginTop: designSystem.spacing.xs,
  },
  authInputContainer: {
    borderColor: designSystem.colors.border,
    borderWidth: 1,
  },
  errorText: {
    ...designSystem.type.bodySmallStrong,
    color: designSystem.colors.liked,
  },
});
