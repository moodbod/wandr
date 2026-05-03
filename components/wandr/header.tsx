import { useQuery } from 'convex/react';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useRouter } from 'expo-router';
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
  UserPlus
} from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassInput } from '@/components/ui/glass-input';
import type { HeaderAction, HeaderConfig } from '@/constants/app-content';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getHeaderBadgeCountsRef } from '@/lib/convex';

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
  leadingContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
  bottomContentHeight?: number;
  bottomContentVisible?: boolean;
  weatherCoords?: readonly [number, number] | null;
};

export function WandrHeader({
  config,
  leadingContent,
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
  const traveler = useCurrentTraveler();
  const hasBadgeActions = trailingActions.some(
    (action) => action.kind === 'chat' || action.kind === 'notifications'
  );
  const badgeCounts = useQuery(
    getHeaderBadgeCountsRef,
    traveler?.slug && hasBadgeActions ? { travelerSlug: traveler.slug } : 'skip'
  );
  const hasActions = Boolean(
    config.leadingAction || leadingContent || trailingActions.length > 0 || weatherCoords || bottomContent
  );
  const hasTopRowContent = Boolean(
    config.leadingAction || leadingContent || trailingActions.length > 0 || weatherCoords || config.searchPlaceholder
  );
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
  const blurBackgroundColor = isDark ? designSystem.colors.darkGlassHeader : designSystem.colors.lightGlassHeader;

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
              <GlassInput
                containerStyle={styles.searchContainer}
                placeholder={config.searchPlaceholder}
                style={[styles.searchInput, { color: textColor }]}
                returnKeyType="search"
              />
            ) : null}

            {leadingContent ? <View style={styles.leadingContent}>{leadingContent}</View> : null}
          </View>

          <View style={styles.trailing}>
            {weatherCoords ? (
              <View style={[
                styles.weatherBadge,
                { backgroundColor: isDark ? designSystem.colors.whiteOverlayThin : designSystem.colors.borderFaint }
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
            {trailingActions.length > 1 ? (
              <HeaderActionGroup
                actions={trailingActions}
                badgeCounts={badgeCounts}
                iconColor={textColor}
                onBack={() => router.back()}
                onNavigate={(href) => router.push(href)}
              />
            ) : trailingActions.map((action, index) => (
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
    </HeaderContainer>
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
  const customRender = typeof action.render === 'function' ? action.render({ iconColor }) : action.render;
  const handlePress = () => {
    if (action.isLoading) {
      return;
    }

    performHeaderAction(action, onBack, onNavigate);
  };

  return (
    <View style={side === 'left' ? styles.leftAction : styles.rightAction}>
      {customRender ? (
        customRender
      ) : (
        <GlassButton
          accessibilityLabel={action.accessibilityLabel ?? action.kind}
          onPress={handlePress}
          width={48}
          height={48}
        >
          {action.isLoading ? <ActivityIndicator color={iconColor} /> : renderHeaderIcon(action, iconColor)}
        </GlassButton>
      )}
      {badgeCount ? (
        <HeaderBadge count={badgeCount} style={styles.floatingBadge} />
      ) : null}
    </View>
  );
}

function HeaderActionGroup({
  actions,
  badgeCounts,
  iconColor,
  onBack,
  onNavigate,
}: {
  actions: HeaderAction[];
  badgeCounts?: { chatUnreadCount: number; notificationUnreadCount: number };
  iconColor: string;
  onBack: () => void;
  onNavigate: (href: NonNullable<HeaderAction['href']>) => void;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const shouldUseNativeGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();
  const isAndroid = Platform.OS === 'android';
  const groupRadius = 24;
  const surfaceColor = isDark ? designSystem.colors.darkGlassHeader : designSystem.colors.whiteOverlayFaint;
  const borderColor = isDark ? designSystem.colors.whiteOverlayBarely : designSystem.colors.borderSoft;
  const fallbackSurfaceColor = isAndroid
    ? (isDark ? designSystem.colors.darkSurface : designSystem.colors.surfaceRaised)
    : surfaceColor;
  const fallbackBorderColor = isAndroid
    ? (isDark ? designSystem.colors.darkBorder : designSystem.colors.lightSurfaceAlt)
    : borderColor;

  return (
    <View style={[styles.actionGroup, { borderRadius: groupRadius }]}>
      {shouldUseNativeGlass ? (
        <>
          <GlassView
            style={[StyleSheet.absoluteFillObject, { borderRadius: groupRadius }]}
            glassEffectStyle="clear"
            tintColor={designSystem.colors.transparentWhite}
          />
          <View
            pointerEvents="none"
            style={[
              styles.actionGroupOverlay,
              {
                borderRadius: groupRadius,
                backgroundColor: surfaceColor,
                borderColor,
              },
            ]}
          />
        </>
      ) : (
        <View
          style={[
            styles.actionGroupFallback,
            {
              borderRadius: groupRadius,
              backgroundColor: fallbackSurfaceColor,
              borderColor: fallbackBorderColor,
            },
            isAndroid ? styles.androidGroupFill : null,
          ]}
        />
      )}

      {actions.map((action, index) => {
        const badgeCount = getActionBadgeCount(action, badgeCounts);
        const customRender = typeof action.render === 'function' ? action.render({ iconColor }) : action.render;

        return (
          <View key={`${action.kind}-${index}`} style={[styles.groupActionWrap, customRender ? styles.groupActionWrapCustom : null]}>
            {index > 0 ? (
              <View
                pointerEvents="none"
                style={[
                  styles.groupDivider,
                  { backgroundColor: isDark ? designSystem.colors.darkBorderSoft : designSystem.colors.borderSoft },
                ]}
              />
            ) : null}
            {customRender ? (
              <View style={styles.groupAction}>{customRender}</View>
            ) : (
              <Pressable
                accessibilityLabel={action.accessibilityLabel ?? action.kind}
                accessibilityRole="button"
                disabled={action.isLoading}
                onPress={() => performHeaderAction(action, onBack, onNavigate)}
                style={({ pressed }) => [
                  styles.groupAction,
                  pressed
                    ? (isAndroid
                        ? { backgroundColor: isDark ? designSystem.colors.darkCard : designSystem.colors.lightSurfaceAlt }
                        : styles.groupActionPressed)
                    : null,
                ]}
              >
                {action.isLoading ? <ActivityIndicator color={iconColor} /> : renderHeaderIcon(action, iconColor)}
              </Pressable>
            )}
            {badgeCount ? (
              <HeaderBadge count={badgeCount} style={styles.groupBadge} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function getActionBadgeCount(
  action: HeaderAction,
  badgeCounts?: { chatUnreadCount: number; notificationUnreadCount: number }
) {
  if (action.kind === 'chat') {
    return badgeCounts?.chatUnreadCount ?? 0;
  }

  if (action.kind === 'notifications') {
    return badgeCounts?.notificationUnreadCount ?? 0;
  }

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
    return;
  }

  if (action.kind === 'notifications') {
    onNavigate('/notifications');
    return;
  }

  if (action.kind === 'chat') {
    onNavigate('/friends/chat');
  }
}

function renderHeaderIcon(action: HeaderAction, color: string) {
  switch (action.kind) {
    case 'avatar':
      return <UserCircle color={color} size={20} weight="fill" />;
    case 'back':
      return <CaretLeft color={color} size={22} weight="bold" />;
    case 'call':
      return <Phone color={color} size={20} weight="bold" />;
    case 'chat':
      return <ChatCircleDots color={color} size={20} weight="bold" />;
    case 'check':
      return <Check color={color} size={20} weight="bold" />;
    case 'favorite':
      return (
        <Heart
          color={action.isActive ? designSystem.colors.liked : color}
          size={20}
          weight={action.isActive ? 'fill' : 'bold'}
        />
      );
    case 'filter':
      return <FadersHorizontal color={color} size={20} weight="bold" />;
    case 'locate':
      return <NavigationArrow color={color} size={20} weight="bold" />;
    case 'map':
      return <MapTrifold color={color} size={20} weight="bold" />;
    case 'search':
      return <MagnifyingGlass color={color} size={20} weight="bold" />;
    case 'menu':
      return <DotsThree color={color} size={20} weight="bold" />;
    case 'notifications':
      return <Bell color={color} size={20} weight="bold" />;
    case 'pencil':
      return <PencilSimple color={color} size={20} weight="bold" />;
    case 'plus':
      return <Plus color={color} size={20} weight="bold" />;
    case 'settings':
      return <GearSix color={color} size={20} weight="bold" />;
    case 'share':
      return <UserPlus color={color} size={20} weight="bold" />;
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
  actionGroup: {
    flexDirection: 'row',
    height: 48,
    overflow: 'visible',
    position: 'relative',
  },
  actionGroupOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionGroupFallback: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
  androidGroupFill: {
    overflow: 'hidden',
  },
  groupActionWrap: {
    height: 48,
    position: 'relative',
    width: 48,
    zIndex: 1,
  },
  groupActionWrapCustom: {
    zIndex: 2,
  },
  groupAction: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    overflow: 'visible',
    width: 48,
  },
  groupActionPressed: {
    opacity: 0.68,
  },
  groupDivider: {
    height: 24,
    left: 0,
    position: 'absolute',
    top: 12,
    width: StyleSheet.hairlineWidth,
  },
  badge: {
    position: 'absolute',
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: designSystem.colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: designSystem.colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 3,
  },
  floatingBadge: {
    top: -3,
    right: -3,
  },
  groupBadge: {
    top: 5,
    right: 7,
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
    height: 32,
    borderRadius: 16,
    backgroundColor: designSystem.colors.whiteOverlayThin,
  },
  weatherText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
