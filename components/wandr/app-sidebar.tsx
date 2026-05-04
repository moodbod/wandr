import { MaterialCommunityIcons } from '@expo/vector-icons';
import { type Href, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

const NAV_ITEMS: readonly {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  outlineIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  href: Href;
}[] = [
  { label: 'Explore', icon: 'compass', outlineIcon: 'compass-outline', href: '/explore' },
  { label: 'Trip', icon: 'map', outlineIcon: 'map-outline', href: '/trip' },
  { label: 'Stays', icon: 'bed', outlineIcon: 'bed-outline', href: '/stays' },
  { label: 'Friends', icon: 'account-group', outlineIcon: 'account-group-outline', href: '/friends' },
  { label: 'Chat', icon: 'chat', outlineIcon: 'chat-outline', href: '/friends/chat' },
  { label: 'Notifications', icon: 'bell', outlineIcon: 'bell-outline', href: '/notifications' },
] as const;

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();

  const activeColor = isDark ? designSystem.colors.lime : designSystem.colors.darkGreen;
  const inactiveColor = isDark ? designSystem.colors.darkText : designSystem.colors.ink;
  const backgroundColor = isDark ? designSystem.colors.darkSurface : designSystem.colors.surfaceRaised;
  const borderColor = isDark ? designSystem.colors.darkSurfaceBorder : designSystem.colors.borderSoft;
  const activeBackground = isDark ? designSystem.colors.whiteOverlayBarely : designSystem.colors.limeSoft;
  const activeHref = getActiveNavHref(pathname);

  return (
    <View
      style={[
        styles.sidebar,
        {
          backgroundColor,
          borderRightColor: borderColor,
          paddingBottom: Math.max(insets.bottom, 16),
          paddingTop: Math.max(insets.top, 16),
        },
      ]}
    >
      <View style={styles.navSection}>
        {NAV_ITEMS.map((item) => {
          const isActive = String(item.href) === activeHref;
          return (
            <Pressable
              accessibilityLabel={item.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              key={item.label}
              onPress={() => router.push(item.href)}
              style={[styles.navItem, isActive && { backgroundColor: activeBackground }]}
            >
              <MaterialCommunityIcons
                name={isActive ? item.icon : item.outlineIcon}
                size={22}
                color={isActive ? activeColor : inactiveColor}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.bottomSection}>
        <Pressable
          accessibilityLabel="Profile"
          accessibilityRole="button"
          onPress={() => router.push('/profile')}
          style={styles.navItem}
        >
          <View style={[styles.avatarCircle, { borderColor }]}>
            <MaterialCommunityIcons name="account-circle-outline" size={22} color={inactiveColor} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function getActiveNavHref(pathname: string) {
  const normalizedPathname = pathname.startsWith('/(tabs)')
    ? pathname.replace('/(tabs)', '')
    : pathname;

  if (
    normalizedPathname === '/friends/chat' ||
    normalizedPathname.startsWith('/friends/chat/') ||
    normalizedPathname.startsWith('/friends/direct/') ||
    normalizedPathname.startsWith('/friends/group/')
  ) {
    return '/friends/chat';
  }

  if (
    normalizedPathname === '/friends' ||
    normalizedPathname.startsWith('/friends/discover') ||
    normalizedPathname.startsWith('/friends/profile/')
  ) {
    return '/friends';
  }

  const activeItem = NAV_ITEMS.find((item) => {
    const href = String(item.href);
    return normalizedPathname === href || normalizedPathname.startsWith(`${href}/`);
  });

  return activeItem ? String(activeItem.href) : null;
}

const styles = StyleSheet.create({
  sidebar: {
    width: 64,
    height: '100%',
    borderRightWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  navSection: {
    gap: 10,
    marginTop: 8,
  },
  navItem: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSection: {
    alignItems: 'center',
  },
});
