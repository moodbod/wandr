import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import {
  Bell,
  CaretLeft,
  Check,
  Cloud,
  CloudFog,
  CloudRain,
  CloudSnow,
  FadersHorizontal,
  GearSix,
  Heart,
  Lightning,
  List,
  MagnifyingGlass,
  MapTrifold,
  NavigationArrow,
  PencilSimple,
  ShareNetwork,
  Sun,
  UserCircle
} from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassInput } from '@/components/ui/glass-input';
import type { HeaderAction, HeaderConfig } from '@/constants/app-content';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type { HeaderAction };

type WeatherData = {
  temp: number;
  description: string;
  code: number;
};

function getWeatherInfo(code: number) {
  if (code === 0) return { desc: 'Clear', Icon: Sun };
  if (code <= 3) return { desc: 'Cloudy', Icon: Cloud };
  if (code <= 48) return { desc: 'Foggy', Icon: CloudFog };
  if (code <= 55) return { desc: 'Drizzle', Icon: CloudRain };
  if (code <= 65) return { desc: 'Rain', Icon: CloudRain };
  if (code <= 75) return { desc: 'Snow', Icon: CloudSnow };
  if (code >= 95) return { desc: 'Storm', Icon: Lightning };
  return { desc: 'Clear', Icon: Sun };
}

type WandrHeaderProps = {
  config: HeaderConfig;
  bottomContent?: React.ReactNode;
  bottomContentHeight?: number;
  bottomContentVisible?: boolean;
  weatherCoords?: readonly [number, number] | null;
};

export function WandrHeader({
  config,
  bottomContent,
  bottomContentHeight = 0,
  bottomContentVisible = false,
  weatherCoords,
}: WandrHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bottomAnimation = useRef(new Animated.Value(bottomContentVisible ? 1 : 0)).current;
  const trailingActions = config.trailingActions ?? [];
  const hasActions = Boolean(config.leadingAction || trailingActions.length > 0 || weatherCoords);
  const isButtonOnlyHeader = true;

  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    if (!weatherCoords) return;
    async function fetchWeather() {
      try {
        const [lng, lat] = weatherCoords!;
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code`
        );
        const data = await res.json();
        if (data.current) {
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            code: data.current.weather_code,
            description: getWeatherInfo(data.current.weather_code).desc,
          });
        }
      } catch (e) {
        console.warn('Failed to fetch weather', e);
      }
    }
    fetchWeather();
  }, [weatherCoords]);

  const themeTextColor = useThemeColor(
    { light: designSystem.colors.ink, dark: designSystem.colors.darkText },
    'text'
  );
  const textColor = themeTextColor;
  const blurBackgroundColor = isDark ? 'rgba(17,19,15,0.7)' : 'rgba(249,249,246,0.7)';

  const HeaderContainer = config.overlay || isButtonOnlyHeader ? View : BlurView;
  const containerProps = config.overlay
    ? { pointerEvents: 'box-none' as const, style: [styles.shell, styles.overlayShell, { paddingTop: insets.top }] }
    : isButtonOnlyHeader
      ? { pointerEvents: 'box-none' as const, style: [styles.shell, styles.overlayShell, styles.transparentShell, { paddingTop: insets.top }] }
    : {
        intensity: 80,
        tint: isDark ? 'dark' as const : 'light' as const,
        style: [styles.shell, styles.overlayShell, { paddingTop: insets.top, backgroundColor: blurBackgroundColor }]
      };

  useEffect(() => {
    Animated.timing(bottomAnimation, {
      toValue: bottomContentVisible ? 1 : 0,
      duration: bottomContentVisible ? 220 : 180,
      easing: bottomContentVisible ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [bottomAnimation, bottomContentVisible]);

  if (!hasActions) {
    return config.overlay ? (
      <View pointerEvents="none" style={[styles.plainSpacer, styles.overlayShell, { paddingTop: insets.top }]} />
    ) : (
      <View style={[styles.plainSpacer, { paddingTop: insets.top }]} />
    );
  }

  const animatedBottomStyle = {
    height: bottomAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, bottomContentHeight],
    }),
    opacity: bottomAnimation,
    transform: [
      {
        translateY: bottomAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [-10, 0],
        }),
      },
    ],
  };

  const WeatherInfo = weather ? getWeatherInfo(weather.code) : null;
  const WeatherIcon = WeatherInfo?.Icon ?? Sun;

  return (
    <HeaderContainer {...containerProps}>
      <View style={styles.content}>
        <View style={styles.leading}>
          {config.leadingAction ? (
            <HeaderActionButton
              action={config.leadingAction}
              iconColor={textColor}
              onBack={() => router.back()}
              onNavigate={(href) => router.push(href)}
              side="left"
            />
          ) : null}

          {config.searchPlaceholder ? (
            <GlassInput
              containerStyle={styles.searchContainer}
              placeholder={config.searchPlaceholder}
              style={[styles.searchInput, { color: textColor }]}
              returnKeyType="search"
            />
          ) : null}
        </View>

        <View style={styles.trailing}>
          {weatherCoords ? (
            <View style={[
              styles.weatherBadge,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(14, 15, 12, 0.06)' }
            ]}>
              {weather ? (
                <>
                  <WeatherIcon size={16} color={textColor} weight="bold" />
                  <ThemedText style={[styles.weatherText, { color: textColor }]}>
                    {weather.temp}°
                  </ThemedText>
                </>
              ) : (
                <ActivityIndicator size="small" color={textColor} />
              )}
            </View>
          ) : null}
          {trailingActions.map((action, index) => (
            <HeaderActionButton
              action={action}
              iconColor={textColor}
              key={`${action.kind}-${index}`}
              onBack={() => router.back()}
              onNavigate={(href) => router.push(href)}
              side="right"
            />
          ))}
        </View>
      </View>
      {bottomContent ? (
        <Animated.View
          pointerEvents={bottomContentVisible ? 'auto' : 'none'}
          style={[styles.bottomContent, animatedBottomStyle]}
        >
          <View style={styles.bottomContentInner}>{bottomContent}</View>
        </Animated.View>
      ) : null}
    </HeaderContainer>
  );
}

function HeaderActionButton({
  action,
  iconColor,
  onBack,
  onNavigate,
  side,
}: {
  action: HeaderAction;
  iconColor: string;
  onBack: () => void;
  onNavigate: (href: NonNullable<HeaderAction['href']>) => void;
  side: 'left' | 'right';
}) {
  const handlePress = () => {
    if (action.kind === 'back') {
      onBack();
      return;
    }

    if (action.onPress) {
      action.onPress();
      return;
    }

    if (action.href) {
      onNavigate(action.href);
    }
  };

  return (
    <View style={side === 'left' ? styles.leftAction : styles.rightAction}>
      <GlassButton
        accessibilityLabel={action.accessibilityLabel ?? action.kind}
        onPress={handlePress}
        width={48}
        height={48}
      >
        {renderHeaderIcon(action, iconColor)}
      </GlassButton>
    </View>
  );
}

function renderHeaderIcon(action: HeaderAction, color: string) {
  switch (action.kind) {
    case 'avatar':
      return <UserCircle color={color} size={20} weight="fill" />;
    case 'back':
      return <CaretLeft color={color} size={22} weight="bold" />;
    case 'check':
      return <Check color={color} size={20} weight="bold" />;
    case 'favorite':
      return <Heart color={color} size={20} weight={action.isActive ? 'fill' : 'bold'} />;
    case 'filter':
      return <FadersHorizontal color={color} size={20} weight="bold" />;
    case 'locate':
      return <NavigationArrow color={color} size={20} weight="bold" />;
    case 'map':
      return <MapTrifold color={color} size={20} weight="bold" />;
    case 'search':
      return <MagnifyingGlass color={color} size={20} weight="bold" />;
    case 'menu':
      return <List color={color} size={22} weight="bold" />;
    case 'notifications':
      return <Bell color={color} size={20} weight="bold" />;
    case 'pencil':
      return <PencilSimple color={color} size={20} weight="bold" />;
    case 'settings':
      return <GearSix color={color} size={20} weight="bold" />;
    case 'share':
      return <ShareNetwork color={color} size={20} weight="bold" />;
  }
}

const styles = StyleSheet.create({
  shell: {
    paddingHorizontal: designSystem.spacing.lg,
    zIndex: 40,
    elevation: 40,
  },
  plainSpacer: {
    minHeight: 56,
  },
  transparentShell: {
    backgroundColor: 'transparent',
  },
  overlayShell: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  content: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: designSystem.spacing.md,
    paddingVertical: 4,
  },
  bottomContent: {
    paddingTop: designSystem.spacing.sm,
    overflow: 'hidden',
  },
  bottomContentInner: {
    paddingBottom: designSystem.spacing.xs,
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  searchContainer: {
    flex: 1,
  },
  searchInput: {
    includeFontPadding: false,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leftAction: {
    alignItems: 'flex-start',
  },
  rightAction: {
    alignItems: 'flex-end',
  },
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  weatherText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
