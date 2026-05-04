import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';

export const unstable_settings = {
  initialRouteName: 'explore',
};

export default function TabLayout() {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const { isLargeScreen } = useResponsive();
  const activeColor = isDark ? designSystem.colors.lime : designSystem.colors.darkGreen;
  const inactiveColor = isDark ? designSystem.colors.darkText : designSystem.colors.ink;
  const tabSurfaceColor = isDark ? designSystem.colors.darkGlassHeader : designSystem.colors.whiteOverlayFaint;
  const selectedTabTint = isDark ? designSystem.colors.whiteOverlayBarely : designSystem.colors.whiteOverlayFaint;
  const androidBottomInset = Math.max(insets.bottom, 18);

  const getTabIcon = (
    name: React.ComponentProps<typeof MaterialCommunityIcons>['name']
  ) => (
    <VectorIcon family={MaterialCommunityIcons} name={name} />
  );

  const getExpoTabIcon =
    (
      outlineName: React.ComponentProps<typeof MaterialCommunityIcons>['name'],
      filledName: React.ComponentProps<typeof MaterialCommunityIcons>['name']
    ) => {
      function TabIcon({ color, focused, size }: { color: string; focused: boolean; size: number }) {
        return (
          <MaterialCommunityIcons color={color} name={focused ? filledName : outlineName} size={size} />
        );
      }

      return TabIcon;
    };

  const tabsContent = (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          lineHeight: 14,
        },
        tabBarShowLabel: true,
        tabBarStyle: isLargeScreen ? { display: 'none' } : {
          backgroundColor: isDark ? designSystem.colors.darkBackground : designSystem.colors.background,
          borderTopColor: isDark ? designSystem.colors.darkSurfaceBorder : designSystem.colors.borderSoft,
          height: 68 + androidBottomInset,
          paddingBottom: androidBottomInset,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: getExpoTabIcon('compass-outline', 'compass'),
        }}
      />
      <Tabs.Screen
        name="trip"
        options={{
          title: 'Trip',
          tabBarIcon: getExpoTabIcon('map-outline', 'map'),
        }}
      />
      <Tabs.Screen
        name="stays"
        options={{
          title: 'Stays',
          tabBarIcon: getExpoTabIcon('bed-outline', 'bed'),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: getExpoTabIcon('account-group-outline', 'account-group'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: getExpoTabIcon('account-circle-outline', 'account-circle'),
        }}
      />
    </Tabs>
  );

  if (isLargeScreen) {
    return (
        <View style={styles.largeContainer}>
            <View style={styles.tabContentColumn}>
                {tabsContent}
            </View>
        </View>
    );
  }

  if (Platform.OS === 'android' || Platform.OS === 'web') {
    return tabsContent;
  }

  return (
    <NativeTabs
      backgroundColor={tabSurfaceColor}
      blurEffect={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
      disableTransparentOnScrollEdge
      iconColor={inactiveColor}
      labelStyle={{ color: inactiveColor }}
      shadowColor={isDark ? designSystem.colors.whiteOverlayBarely : designSystem.colors.borderSoft}
      tintColor={selectedTabTint}
    >
      <NativeTabs.Trigger name="index" hidden />

      <NativeTabs.Trigger name="explore">
        <Label>Explore</Label>
        <Icon
          src={{
            default: getTabIcon('compass-outline'),
            selected: getTabIcon('compass'),
          }}
          selectedColor={activeColor}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="trip">
        <Label>Trip</Label>
        <Icon
          src={{
            default: getTabIcon('map-outline'),
            selected: getTabIcon('map'),
          }}
          selectedColor={activeColor}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="stays">
        <Label>Stays</Label>
        <Icon
          src={{
            default: getTabIcon('bed-outline'),
            selected: getTabIcon('bed'),
          }}
          selectedColor={activeColor}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="friends">
        <Label>Friends</Label>
        <Icon
          src={{
            default: getTabIcon('account-group-outline'),
            selected: getTabIcon('account-group'),
          }}
          selectedColor={activeColor}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Label>Profile</Label>
        <Icon
          src={{
            default: getTabIcon('account-circle-outline'),
            selected: getTabIcon('account-circle'),
          }}
          selectedColor={activeColor}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

const styles = StyleSheet.create({
  largeLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
  largeContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  tabContentColumn: {
    flex: 1,
  },
});
