import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Bed, Compass, MapTrifold, UserCircle, UsersThree } from 'phosphor-react-native';
import { useMemo } from 'react';
import { DynamicColorIOS, Platform, StyleSheet, View, type ColorValue, type ImageSourcePropType } from 'react-native';

import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';

export const unstable_settings = {
  initialRouteName: 'explore',
};

const JS_TAB_ICON_SIZE = 21;
const NATIVE_TAB_ICON_SIZE = 21;

type MaterialCommunityIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type NativeTabIconSources = Record<'explore' | 'trip' | 'stays' | 'friends' | 'profile', ImageSourcePropType>;

type PhosphorTabIcon = React.ComponentType<{
  color?: string;
  size?: number;
  weight?: 'regular' | 'fill';
}>;

function makeTabIcon(Icon: PhosphorTabIcon) {
  return function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return (
      <Icon
        color={String(color)}
        size={Math.min(size ?? JS_TAB_ICON_SIZE, JS_TAB_ICON_SIZE)}
        weight={focused ? 'fill' : 'regular'}
      />
    );
  };
}

function makeNativeTabIconSource(name: MaterialCommunityIconName) {
  return MaterialCommunityIcons.getImageSource(name, NATIVE_TAB_ICON_SIZE, 'white') as unknown as ImageSourcePropType;
}

export default function TabLayout() {
  const { isLargeScreen } = useResponsive();
  const colorScheme = useColorScheme();
  const nativeTabIcons = useMemo<NativeTabIconSources | null>(() => {
    if (Platform.OS !== 'ios') {
      return null;
    }

    return {
      explore: makeNativeTabIconSource('compass'),
      friends: makeNativeTabIconSource('account-group'),
      profile: makeNativeTabIconSource('account-circle'),
      stays: makeNativeTabIconSource('bed'),
      trip: makeNativeTabIconSource('map'),
    };
  }, []);
  const isDark = colorScheme === 'dark';
  const tint = isDark ? designSystem.colors.lime : designSystem.semantic.light.text;
  const inactiveTint = isDark
    ? designSystem.semantic.dark.textSubtle
    : designSystem.semantic.light.textMuted;
  const nativeTint =
    Platform.OS === 'ios'
      ? DynamicColorIOS({
          light: designSystem.semantic.light.text,
          dark: designSystem.colors.lime,
        })
      : tint;
  const nativeInactiveTint =
    Platform.OS === 'ios'
      ? DynamicColorIOS({
          light: designSystem.semantic.light.textMuted,
          dark: designSystem.semantic.dark.textSubtle,
        })
      : inactiveTint;

  const tabsContent = (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tint,
        tabBarInactiveTintColor: inactiveTint,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
        tabBarStyle: isLargeScreen
          ? { display: 'none' }
          : {
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: isDark
                ? designSystem.semantic.dark.border
                : designSystem.semantic.light.border,
              backgroundColor: isDark
                ? designSystem.semantic.dark.surface
                : designSystem.semantic.light.surface,
            },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: makeTabIcon(Compass) }} />
      <Tabs.Screen name="trip" options={{ title: 'Trip', tabBarIcon: makeTabIcon(MapTrifold) }} />
      <Tabs.Screen name="stays" options={{ title: 'Stays', tabBarIcon: makeTabIcon(Bed) }} />
      <Tabs.Screen name="friends" options={{ title: 'Friends', tabBarIcon: makeTabIcon(UsersThree) }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: makeTabIcon(UserCircle) }} />
    </Tabs>
  );

  if (isLargeScreen) {
    return (
      <View style={styles.largeContainer}>
        <View style={{ flex: 1 }}>{tabsContent}</View>
      </View>
    );
  }

  if (Platform.OS !== 'ios' || !nativeTabIcons) {
    return tabsContent;
  }

  return (
    <NativeTabs
      blurEffect="systemMaterial"
      disableTransparentOnScrollEdge
      iconColor={{ default: nativeInactiveTint, selected: nativeTint }}
      labelStyle={{
        default: { color: nativeInactiveTint, fontSize: 11, fontWeight: '500' },
        selected: { color: nativeTint, fontSize: 11, fontWeight: '600' },
      }}
      minimizeBehavior="onScrollDown"
      sidebarAdaptable
      tintColor={nativeTint}>
      <NativeTabs.Trigger name="index" hidden />
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon renderingMode="template" src={nativeTabIcons.explore} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="trip">
        <NativeTabs.Trigger.Label>Trip</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon renderingMode="template" src={nativeTabIcons.trip} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stays">
        <NativeTabs.Trigger.Label>Stays</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon renderingMode="template" src={nativeTabIcons.stays} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="friends">
        <NativeTabs.Trigger.Label>Friends</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon renderingMode="template" src={nativeTabIcons.friends} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon renderingMode="template" src={nativeTabIcons.profile} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

const styles = StyleSheet.create({
  largeContainer: {
    flex: 1,
    flexDirection: 'row',
  },
});
