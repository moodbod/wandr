import { Tabs } from 'expo-router';
import {
  CompassIcon,
  HouseIcon,
  MapTrifoldIcon,
  UserCircleIcon,
  UsersThreeIcon
} from 'phosphor-react-native';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].card,
          borderTopColor: Colors[colorScheme ?? 'light'].border,
        },
        headerStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].background,
        },
        headerTintColor: Colors[colorScheme ?? 'light'].text,
        headerTitleStyle: {
          fontWeight: '700',
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          headerShown: true,
          tabBarIcon: ({ color, size, focused }) => (
            <CompassIcon color={color} size={size} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      <Tabs.Screen
        name="trip"
        options={{
          title: 'Trip',
          headerShown: true,
          tabBarIcon: ({ color, size, focused }) => (
            <MapTrifoldIcon color={color} size={size} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      <Tabs.Screen
        name="stays"
        options={{
          title: 'Stays',
          headerShown: true,
          tabBarIcon: ({ color, size, focused }) => (
            <HouseIcon color={color} size={size} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      <Tabs.Screen
        name="squad"
        options={{
          title: 'Squad',
          headerShown: true,
          tabBarIcon: ({ color, size, focused }) => (
            <UsersThreeIcon color={color} size={size} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: true,
          tabBarIcon: ({ color, size, focused }) => (
            <UserCircleIcon color={color} size={size} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
    </Tabs>
  );
}
