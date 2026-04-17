import { useColorScheme } from '@/hooks/use-color-scheme';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import {
  BedIcon,
  CompassIcon,
  MapTrifoldIcon,
  UserCircleIcon,
  UsersIcon
} from 'phosphor-react-native';
import React from 'react';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const activeColor = '#729e57ff'; // Wise Green
  const inactiveColor = isDark ? '#7f7f7bff' : '#33372cff'; // Gray in dark mode, Near Black in light mode

  const getAndroidIcon = (IconComponent: any, isSelected: boolean) => (
    <IconComponent 
      color={isSelected ? activeColor : inactiveColor} 
      size={18} 
      weight={isSelected ? 'fill' : 'bold'} 
    />
  );

  return (
    <NativeTabs
      tintColor={activeColor}
    >
      <NativeTabs.Trigger name="index" hidden />
      
      <NativeTabs.Trigger name="explore">
        <Label>Explore</Label>
        <Icon 
          sf={{ default: 'safari', selected: 'safari.fill' }}
          androidSrc={{
            default: getAndroidIcon(CompassIcon, false),
            selected: getAndroidIcon(CompassIcon, true),
          }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="trip">
        <Label>Trip</Label>
        <Icon 
          sf={{ default: 'map', selected: 'map.fill' }}
          androidSrc={{
            default: getAndroidIcon(MapTrifoldIcon, false),
            selected: getAndroidIcon(MapTrifoldIcon, true),
          }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="stays">
        <Label>Stays</Label>
        <Icon 
          sf={{ default: 'bed.double', selected: 'bed.double.fill' }}
          androidSrc={{
            default: getAndroidIcon(BedIcon, false),
            selected: getAndroidIcon(BedIcon, true),
          }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="squad">
        <Label>Squad</Label>
        <Icon 
          sf={{ default: 'person.2', selected: 'person.2.fill' }}
          androidSrc={{
            default: getAndroidIcon(UsersIcon, false),
            selected: getAndroidIcon(UsersIcon, true),
          }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Label>Profile</Label>
        <Icon 
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          androidSrc={{
            default: getAndroidIcon(UserCircleIcon, false),
            selected: getAndroidIcon(UserCircleIcon, true),
          }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
