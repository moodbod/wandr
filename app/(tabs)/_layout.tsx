import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { designSystem } from '@/constants/design-system';
import { useResponsive } from '@/hooks/use-responsive';

export const unstable_settings = {
  initialRouteName: 'explore',
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isLargeScreen } = useResponsive();
  const activeColor = designSystem.colors.lime;
  const inactiveColor = designSystem.colors.darkTextSoft;
  const tabSurfaceColor = designSystem.colors.darkGlassHeader;
  const selectedTabTint = designSystem.colors.whiteOverlayBarely;
  const tabIconSize = 22;
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
      function TabIcon({ color, focused }: { color: string; focused: boolean; size: number }) {
        return (
          <MaterialCommunityIcons color={color} name={focused ? filledName : outlineName} size={tabIconSize} />
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
          fontSize: 11,
          fontWeight: '600',
          lineHeight: 13,
          marginTop: 0,
          paddingBottom: 0,
        },
        tabBarIconStyle: {
          height: 24,
          marginBottom: 0,
          marginTop: 0,
        },
        tabBarItemStyle: {
          height: 54,
          paddingTop: 4,
          paddingBottom: 4,
        },
        tabBarShowLabel: true,
        tabBarStyle: isLargeScreen ? { display: 'none' } : {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: Platform.OS === 'web' ? 14 : Math.max(insets.bottom, 10) - 2,
          height: 72,
          paddingBottom: 8,
          paddingTop: 8,
          paddingHorizontal: 8,
          borderTopWidth: 0,
          borderRadius: 32,
          borderWidth: 1,
          backgroundColor: designSystem.colors.darkGlassStrong,
          borderColor: designSystem.colors.darkSurfaceBorder,
          elevation: 16,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: getExpoTabIcon('compass', 'compass'),
        }}
      />
      <Tabs.Screen
        name="trip"
        options={{
          title: 'Trip',
          tabBarIcon: getExpoTabIcon('map', 'map'),
        }}
      />
      <Tabs.Screen
        name="stays"
        options={{
          title: 'Stays',
          tabBarIcon: getExpoTabIcon('bed', 'bed'),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: getExpoTabIcon('account-group', 'account-group'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: getExpoTabIcon('account-circle', 'account-circle'),
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
      blurEffect="systemChromeMaterialDark"
      disableTransparentOnScrollEdge
      iconColor={inactiveColor}
      labelStyle={{ color: inactiveColor }}
      shadowColor={designSystem.colors.whiteOverlayBarely}
      tintColor={selectedTabTint}
    >
      <NativeTabs.Trigger name="index" hidden />

      <NativeTabs.Trigger name="explore">
        <Label>Explore</Label>
        <Icon
          src={{
            default: getTabIcon('compass'),
            selected: getTabIcon('compass'),
          }}
          selectedColor={activeColor}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="trip">
        <Label>Trip</Label>
        <Icon
          src={{
            default: getTabIcon('map'),
            selected: getTabIcon('map'),
          }}
          selectedColor={activeColor}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="stays">
        <Label>Stays</Label>
        <Icon
          src={{
            default: getTabIcon('bed'),
            selected: getTabIcon('bed'),
          }}
          selectedColor={activeColor}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="friends">
        <Label>Friends</Label>
        <Icon
          src={{
            default: getTabIcon('account-group'),
            selected: getTabIcon('account-group'),
          }}
          selectedColor={activeColor}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Label>Profile</Label>
        <Icon
          src={{
            default: getTabIcon('account-circle'),
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
