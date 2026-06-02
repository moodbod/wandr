import { useQuery } from 'convex/react';
import { useRouter, useSegments } from 'expo-router';
import {
  Bell,
  CaretLeft,
  Check,
  ChatCircleDots,
  Cloud,
  CloudFog,
  CloudRain,
  CloudSnow,
  DotsThree,
  FadersHorizontal,
  GearSix,
  Heart,
  Lightning,
  MagnifyingGlass,
  MapTrifold,
  NavigationArrow,
  Phone,
  PencilSimple,
  Plus,
  Sun,
  UserCircle,
  UserPlus,
} from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { GlassButton } from '@/components/ui/glass-button';
import { Input } from '@/components/ui/input';
import type { HeaderAction, HeaderConfig } from '@/constants/app-content';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useResponsive } from '@/hooks/use-responsive';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getHeaderBadgeCountsRef } from '@/lib/convex';

export type { HeaderAction };

type WeatherData = { temp: number; description: string; code: number };

function getWeatherInfo(code: number) {
  if (code === 0) return { desc: 'Clear', Icon: Sun };
  if (code <= 3) return { desc: 'Cloudy', Icon: Cloud };
  if (code <= 48) return { desc: 'Foggy', Icon: CloudFog };
  if (code <= 65) return { desc: 'Rain', Icon: CloudRain };
  if (code <= 75) return { desc: 'Snow', Icon: CloudSnow };
  if (code >= 95) return { desc: 'Storm', Icon: Lightning };
  return { desc: 'Clear', Icon: Sun };
}

type WandrHeaderProps = {
  config: HeaderConfig;
  leadingContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
  bottomContentHeight?: number;
  bottomContentVisible?: boolean;
  extraTopInset?: number;
  weatherCoords?: readonly [number, number] | null;
};

export function WandrHeader({
  config,
  leadingContent,
  bottomContent,
  bottomContentHeight = 0,
  bottomContentVisible = false,
  extraTopInset = 0,
  weatherCoords,
}: WandrHeaderProps) {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const { isMobile } = useResponsive();
  const isDark = colorScheme === 'dark';
  const isMobileWeb = Platform.OS === 'web' && isMobile;
  const headerHorizontalInset = isMobileWeb ? designSystem.spacing.sm : designSystem.spacing.lg;
  const mobileWebTopInset = isMobileWeb ? designSystem.spacing.xs : 0;
  const headerTopInset = insets.top + extraTopInset + mobileWebTopInset;
  const plainSpacerTopInset = insets.top + mobileWebTopInset;
  const bottomAnimation = useRef(new Animated.Value(bottomContentVisible ? 1 : 0)).current;
  const trailingActions = config.trailingActions ?? [];
  const traveler = useCurrentTraveler();
  const hasBadgeActions = trailingActions.some(
    (a) => a.kind === 'chat' || a.kind === 'notifications'
  );
  const badgeCounts = useQuery(
    getHeaderBadgeCountsRef,
    traveler?.slug && hasBadgeActions ? { travelerSlug: traveler.slug } : 'skip'
  );
  const hasTopRowContent = Boolean(
    config.leadingAction ||
      leadingContent ||
      trailingActions.length > 0 ||
      weatherCoords ||
      config.searchPlaceholder
  );
  const hasActions = hasTopRowContent || Boolean(bottomContent);
  const isNativeStackScreen = Boolean(segments[0]) && segments[0] !== '(tabs)';

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
      } catch {
        // ignore weather fetch errors
      }
    }
    fetchWeather();
  }, [weatherCoords]);

  useEffect(() => {
    Animated.spring(bottomAnimation, {
      toValue: bottomContentVisible ? 1 : 0,
      useNativeDriver: false,
      speed: 14,
      bounciness: 0,
    }).start();
  }, [bottomAnimation, bottomContentVisible]);

  const textColor = useThemeColor(
    { light: designSystem.colors.ink, dark: designSystem.colors.darkText },
    'text'
  );

  if (isNativeStackScreen) {
    return null;
  }

  if (!hasActions) {
    return config.overlay ? (
      <View pointerEvents="none" style={[styles.plainSpacer, styles.overlayShell, { paddingTop: plainSpacerTopInset }]} />
    ) : (
      <View style={[styles.plainSpacer, { paddingTop: plainSpacerTopInset }]} />
    );
  }

  const animatedBottomStyle = {
    height: bottomAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, bottomContentHeight] }),
    opacity: bottomAnimation,
    transform: [{ translateY: bottomAnimation.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
  };

  const WeatherInfo = weather ? getWeatherInfo(weather.code) : null;
  const WeatherIcon = WeatherInfo?.Icon ?? Sun;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.shell,
        styles.overlayShell,
        styles.transparentShell,
        { paddingHorizontal: headerHorizontalInset, paddingTop: headerTopInset },
      ]}
    >
      {hasTopRowContent ? (
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
              <Input
                containerStyle={styles.searchContainer}
                leftIcon={
                  <MagnifyingGlass
                    color={isDark ? designSystem.colors.darkPlaceholderText : designSystem.colors.placeholderText}
                    size={18}
                    weight="regular"
                  />
                }
                placeholder={config.searchPlaceholder}
                style={[styles.searchInput, { color: textColor }]}
                returnKeyType="search"
              />
            ) : null}
            {leadingContent ? <View style={styles.leadingContent}>{leadingContent}</View> : null}
          </View>

          <View style={styles.trailing}>
            {weatherCoords ? (
              <View
                style={[
                  styles.weatherBadge,
                  {
                    backgroundColor: isDark
                      ? designSystem.colors.whiteOverlayThin
                      : designSystem.colors.borderFaint,
                  },
                ]}
              >
                {weather ? (
                  <>
                    <WeatherIcon size={15} color={textColor} weight="bold" />
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
                badgeCount={getActionBadgeCount(action, badgeCounts)}
                iconColor={textColor}
                key={`${action.kind}-${index}`}
                onBack={() => router.back()}
                onNavigate={(href) => router.push(href)}
                side="right"
              />
            ))}
          </View>
        </View>
      ) : null}

      {bottomContent ? (
        <Animated.View
          pointerEvents={bottomContentVisible ? 'auto' : 'none'}
          style={[styles.bottomContent, animatedBottomStyle]}
        >
          <View style={styles.bottomContentInner}>{bottomContent}</View>
        </Animated.View>
      ) : null}
    </View>
  );
}

function HeaderActionButton({
  action,
  badgeCount,
  iconColor,
  onBack,
  onNavigate,
  side,
}: {
  action: HeaderAction;
  badgeCount?: number;
  iconColor: string;
  onBack: () => void;
  onNavigate: (href: NonNullable<HeaderAction['href']>) => void;
  side: 'left' | 'right';
}) {
  const customRender =
    typeof action.render === 'function' ? action.render({ iconColor }) : action.render;

  const handlePress = () => {
    if (action.isLoading) return;
    performHeaderAction(action, onBack, onNavigate);
  };

  return (
    <View style={side === 'left' ? styles.leftAction : styles.rightAction}>
      {customRender ? (
        customRender
      ) : (
        <GlassButton
          accessibilityLabel={action.accessibilityLabel ?? action.kind}
          disabled={action.isLoading}
          height={44}
          onPress={handlePress}
          style={styles.iconButton}
          width={44}>
          {action.isLoading ? (
            <ActivityIndicator color={iconColor} />
          ) : (
            renderHeaderIcon(action, iconColor)
          )}
        </GlassButton>
      )}
      {badgeCount ? <HeaderBadge count={badgeCount} style={styles.floatingBadge} /> : null}
    </View>
  );
}

function getActionBadgeCount(
  action: HeaderAction,
  badgeCounts?: { chatUnreadCount: number; notificationUnreadCount: number }
) {
  if (action.kind === 'chat') return badgeCounts?.chatUnreadCount ?? 0;
  if (action.kind === 'notifications') return badgeCounts?.notificationUnreadCount ?? 0;
  return 0;
}

function HeaderBadge({ count, style }: { count: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.badge, style]}>
      <ThemedText style={styles.badgeText}>{count > 9 ? '9+' : String(count)}</ThemedText>
    </View>
  );
}

function performHeaderAction(
  action: HeaderAction,
  onBack: () => void,
  onNavigate: (href: NonNullable<HeaderAction['href']>) => void
) {
  if (action.onPress) { action.onPress(); return; }
  if (action.kind === 'back') { onBack(); return; }
  if (action.href) { onNavigate(action.href); return; }
  if (action.kind === 'notifications') { onNavigate('/notifications'); return; }
  if (action.kind === 'chat') { onNavigate('/friends/chat'); }
}

function renderHeaderIcon(action: HeaderAction, color: string) {
  switch (action.kind) {
    case 'avatar': return <UserCircle color={color} size={22} weight="regular" />;
    case 'back': return <CaretLeft color={color} size={22} weight="bold" />;
    case 'call': return <Phone color={color} size={20} weight="regular" />;
    case 'chat': return <ChatCircleDots color={color} size={22} weight="regular" />;
    case 'check': return <Check color={color} size={20} weight="bold" />;
    case 'favorite': return (
      <Heart
        color={action.isActive ? designSystem.colors.liked : color}
        size={22}
        weight={action.isActive ? 'fill' : 'regular'}
      />
    );
    case 'filter': return <FadersHorizontal color={color} size={20} weight="regular" />;
    case 'locate': return <NavigationArrow color={color} size={20} weight="regular" />;
    case 'map': return <MapTrifold color={color} size={20} weight="regular" />;
    case 'search': return <MagnifyingGlass color={color} size={20} weight="regular" />;
    case 'menu': return <DotsThree color={color} size={22} weight="bold" />;
    case 'notifications': return <Bell color={color} size={22} weight="regular" />;
    case 'pencil': return <PencilSimple color={color} size={20} weight="regular" />;
    case 'plus': return <Plus color={color} size={22} weight="bold" />;
    case 'settings': return <GearSix color={color} size={20} weight="regular" />;
    case 'share': return <UserPlus color={color} size={20} weight="regular" />;
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
    overflow: 'visible',
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
  leadingContent: {
    flexShrink: 1,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leftAction: {
    alignItems: 'flex-start',
    position: 'relative',
  },
  rightAction: {
    alignItems: 'flex-end',
    position: 'relative',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: designSystem.colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1,
    elevation: 3,
  },
  floatingBadge: {
    top: -2,
    right: -2,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 11,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
    includeFontPadding: false,
  },
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 15,
  },
  weatherText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
