import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  CaretLeft,
  GearSix,
  Heart,
  List,
  MapTrifold,
  ShareNetwork,
  UserCircle,
} from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { designSystem } from '@/constants/design-system';
import type { HeaderAction, HeaderActionKind, HeaderConfig } from '@/constants/app-content';
import { useThemeColor } from '@/hooks/use-theme-color';

type WandrHeaderProps = {
  config: HeaderConfig;
};

export function WandrHeader({ config }: WandrHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const textColor = useThemeColor(
    { light: designSystem.colors.ink, dark: designSystem.colors.darkText },
    'text'
  );
  const headerBackground = useThemeColor(
    config.overlay
      ? { light: 'transparent', dark: 'transparent' }
      : { light: 'rgba(249,249,246,0.88)', dark: 'rgba(17,19,15,0.88)' },
    'background'
  );
  const surfaceColor = useThemeColor(
    { light: designSystem.colors.surface, dark: designSystem.colors.darkSurface },
    'card'
  );

  return (
    <ThemedView
      lightColor={headerBackground}
      darkColor={headerBackground}
      style={[styles.shell, config.overlay ? styles.overlayShell : null, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.leading}>
          {config.leadingAction ? (
            <HeaderActionButton
              action={config.leadingAction}
              iconColor={textColor}
              side="left"
              surfaceColor={surfaceColor}
              onBack={() => router.back()}
            />
          ) : null}

          {config.showLogo ? (
            <ThemedText style={styles.logo}>Wandr</ThemedText>
          ) : config.title ? (
            <View style={styles.titleBlock}>
              <ThemedText style={styles.title}>{config.title}</ThemedText>
              {config.subtitle ? <ThemedText style={styles.subtitle}>{config.subtitle}</ThemedText> : null}
            </View>
          ) : null}
        </View>

        <View style={styles.trailing}>
          {config.trailingActions?.map((action, index) => (
            <HeaderActionButton
              action={action}
              iconColor={textColor}
              key={`${action.kind}-${index}`}
              onBack={() => router.back()}
              side="right"
              surfaceColor={surfaceColor}
            />
          ))}
        </View>
      </View>
    </ThemedView>
  );
}

function HeaderActionButton({
  action,
  iconColor,
  onBack,
  side,
  surfaceColor,
}: {
  action: HeaderAction;
  iconColor: string;
  onBack: () => void;
  side: 'left' | 'right';
  surfaceColor: string;
}) {
  const isSurface = action.tone === 'surface' || action.kind === 'avatar';

  return (
    <Pressable
      accessibilityLabel={action.accessibilityLabel ?? action.kind}
      onPress={action.kind === 'back' ? onBack : undefined}
      style={({ pressed }) => [
        styles.actionButton,
        side === 'left' ? styles.leftAction : styles.rightAction,
        isSurface ? { backgroundColor: surfaceColor } : null,
        pressed ? styles.pressed : null,
      ]}>
      {renderHeaderIcon(action.kind, iconColor)}
    </Pressable>
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
    case 'map':
      return <MapTrifold color={color} size={20} weight="bold" />;
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
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexShrink: 1,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    minWidth: 24,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftAction: {
    alignItems: 'flex-start',
  },
  rightAction: {
    alignItems: 'flex-end',
  },
  logo: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -1,
    color: designSystem.colors.darkGreen,
  },
  titleBlock: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  title: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '900',
    letterSpacing: -0.8,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: designSystem.colors.gray,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
});
