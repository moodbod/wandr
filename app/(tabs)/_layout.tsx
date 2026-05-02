import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  initialRouteName: 'explore',
};

export default function TabLayout() {
  const isDark = useColorScheme() === 'dark';
  const activeColor = isDark ? designSystem.colors.lime : designSystem.colors.darkGreen;
  const inactiveColor = isDark ? designSystem.colors.darkText : designSystem.colors.ink;
  const tabSurfaceColor = isDark ? designSystem.colors.darkGlassHeader : designSystem.colors.whiteOverlayFaint;
  const selectedTabTint = isDark ? designSystem.colors.whiteOverlayBarely : designSystem.colors.whiteOverlayFaint;

  const getTabIcon = (
    name: React.ComponentProps<typeof MaterialCommunityIcons>['name']
  ) => (
    <VectorIcon family={MaterialCommunityIcons} name={name} />
  );

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
