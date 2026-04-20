import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import {
    Bell,
    CaretLeft,
    FadersHorizontal,
    GearSix,
    Heart,
    List,
    MagnifyingGlass,
    NavigationArrow,
    MapTrifold,
    ShareNetwork,
    UserCircle,
} from 'phosphor-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/ui/glass-button';
import { GlassInput } from '@/components/ui/glass-input';
import type { HeaderAction, HeaderActionKind, HeaderConfig } from '@/constants/app-content';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

type WandrHeaderProps = {
  config: HeaderConfig;
  bottomContent?: React.ReactNode;
  bottomContentHeight?: number;
  bottomContentVisible?: boolean;
};

export function WandrHeader({
  config,
  bottomContent,
  bottomContentHeight = 0,
  bottomContentVisible = false,
}: WandrHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bottomAnimation = useRef(new Animated.Value(bottomContentVisible ? 1 : 0)).current;
  const trailingActions = config.trailingActions ?? [];
  const hasActions = Boolean(config.leadingAction || trailingActions.length > 0);
  const isButtonOnlyHeader = true;
  
  const themeTextColor = useThemeColor(
    { light: designSystem.colors.ink, dark: designSystem.colors.darkText },
    'text'
  );
  const textColor = config.overlay && isButtonOnlyHeader ? '#ffffff' : themeTextColor;
  
  // Define fallback colors for the BlurView tint
  const blurBackgroundColor = isDark ? 'rgba(17,19,15,0.7)' : 'rgba(249,249,246,0.7)';

  const HeaderContainer = config.overlay || isButtonOnlyHeader ? View : BlurView;
  const containerProps = config.overlay 
    ? { style: [styles.shell, styles.overlayShell, { paddingTop: insets.top }] }
    : isButtonOnlyHeader
      ? { style: [styles.shell, styles.overlayShell, styles.transparentShell, { paddingTop: insets.top }] }
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
        {renderHeaderIcon(action.kind, iconColor)}
      </GlassButton>
    </View>
  );
}

function renderHeaderIcon(kind: HeaderActionKind, color: string) {
  switch (kind) {
    case 'avatar':
      return <UserCircle color={color} size={20} weight="fill" />;
    case 'back':
      return <CaretLeft color={color} size={22} weight="bold" />;
    case 'favorite':
      return <Heart color={color} size={20} weight="bold" />;
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
    case 'settings':
      return <GearSix color={color} size={20} weight="bold" />;
    case 'share':
      return <ShareNetwork color={color} size={20} weight="bold" />;
  }
}

const styles = StyleSheet.create({
  shell: {
    paddingHorizontal: designSystem.spacing.lg,
    zIndex: 20,
    elevation: 20,
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
});
