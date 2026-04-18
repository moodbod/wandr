import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import React from 'react';

export default function TabLayout() {
  const activeColor = '#729e57ff'; // Wise Green

  const getTabIcon = (
    name: React.ComponentProps<typeof MaterialCommunityIcons>['name']
  ) => (
    <VectorIcon family={MaterialCommunityIcons} name={name} />
  );

  return (
    <NativeTabs tintColor={activeColor}>
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

      <NativeTabs.Trigger name="squad">
        <Label>Squad</Label>
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
