import { MaterialCommunityIcons } from '@expo/vector-icons';
import { type Href, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useManagerMode } from '@/hooks/use-manager-mode';
import { useManagerResourceMode } from '@/hooks/use-manager-resource-mode';
import { WandrAvatar } from '@/components/wandr/avatar';
import { useAuthSession } from '@/providers/auth-session';

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
  const traveler = useCurrentTraveler();
  const { session } = useAuthSession();
  const isAdmin = session?.role === 'admin';
  const { isManagerMode } = useManagerMode(session?.travelerSlug, isAdmin);
  const { mode: managerResourceMode, openManager, setSurface, surface: managerSurface } = useManagerResourceMode();

  const activeColor = isDark ? designSystem.colors.lime : designSystem.colors.fern;
  const inactiveColor = isDark ? designSystem.colors.darkTextSoft : designSystem.colors.mutedText;
  const surfaceColor = isDark ? designSystem.colors.darkOliveGlassSoft : designSystem.colors.whiteGlassHigh;
  const borderColor = isDark ? designSystem.colors.whiteOverlayBarely : designSystem.colors.whiteBorder;
  const activeBackground = isDark ? designSystem.colors.whiteOverlayThin : designSystem.colors.limeMist;
  const activeHref = getActiveNavHref(pathname);
  const canUseManagerMode = isAdmin && isManagerMode;

  return (
    <View
      style={[
        styles.sidebar,
        {
          paddingBottom: Math.max(insets.bottom, 16),
          paddingTop: Math.max(insets.top, 16),
        },
      ]}
    >
      <View style={styles.topStack}>
        <View style={[styles.navSection, { backgroundColor: surfaceColor, borderColor }]}>
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
      </View>

      <View style={styles.bottomStack}>
        {canUseManagerMode ? (
          <View style={[styles.managerSection, { backgroundColor: surfaceColor, borderColor }]}>
            <Pressable
              accessibilityLabel="Manage experiences and groups"
              accessibilityRole="button"
              accessibilityState={{ selected: activeHref === '/profile' && managerSurface === 'manager' && managerResourceMode === 'experiences' }}
              onPress={() => {
                openManager('experiences');
                router.push('/profile');
              }}
              style={[
                styles.navItem,
                activeHref === '/profile' && managerSurface === 'manager' && managerResourceMode === 'experiences' && { backgroundColor: activeBackground },
              ]}
            >
              <MaterialCommunityIcons
                name="map-marker-path"
                size={22}
                color={activeHref === '/profile' && managerSurface === 'manager' && managerResourceMode === 'experiences' ? activeColor : inactiveColor}
              />
            </Pressable>
            <Pressable
              accessibilityLabel="Manage rooms"
              accessibilityRole="button"
              accessibilityState={{ selected: activeHref === '/profile' && managerSurface === 'manager' && managerResourceMode === 'rooms' }}
              onPress={() => {
                openManager('rooms');
                router.push('/profile');
              }}
              style={[
                styles.navItem,
                activeHref === '/profile' && managerSurface === 'manager' && managerResourceMode === 'rooms' && { backgroundColor: activeBackground },
              ]}
            >
              <MaterialCommunityIcons
                name="bed-king"
                size={22}
                color={activeHref === '/profile' && managerSurface === 'manager' && managerResourceMode === 'rooms' ? activeColor : inactiveColor}
              />
            </Pressable>
          </View>
        ) : null}
        <View style={styles.bottomSection}>
        <Pressable
          accessibilityLabel="Profile"
          accessibilityRole="button"
          onPress={() => {
            setSurface('profile');
            router.push('/profile');
          }}
          style={styles.profileNavItem}
        >
          <WandrAvatar
            name={traveler?.name || 'Traveler'}
            paletteKey={traveler?.slug}
            size={32}
            uri={traveler?.avatarUri}
            style={[styles.avatarCircle, { borderColor }]}
          />
        </Pressable>
        </View>
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    top: 0,
    width: 76,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    zIndex: 100,
  },
  navSection: {
    gap: 10,
    borderRadius: 30,
    borderWidth: 1,
    padding: 7,
  },
  navItem: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topStack: {
    alignItems: 'center',
    gap: 14,
  },
  bottomStack: {
    gap: 10,
  },
  managerSection: {
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    gap: 8,
    padding: 6,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileNavItem: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSection: {
    alignItems: 'center',
  },
});
