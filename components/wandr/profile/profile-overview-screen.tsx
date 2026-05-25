import { useQuery } from 'convex/react';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { CalendarBlank, ImagesSquare, Ticket } from 'phosphor-react-native';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { WandrHeader } from '@/components/wandr/header';
import { LargeScreenPanel, LargeScreenWorkspace } from '@/components/wandr/large-screen-workspace';
import { AppMapWorkspace } from '@/components/wandr/maps/app-map-workspace';
import { designSystem } from '@/constants/design-system';
import { useCurrentTraveler } from '@/hooks/use-current-traveler';
import { useCurrentUserSettings } from '@/hooks/use-current-user-settings';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useManagerMode } from '@/hooks/use-manager-mode';
import { useManagerResourceMode } from '@/hooks/use-manager-resource-mode';
import { useResponsive } from '@/hooks/use-responsive';
import {
  getFriendsDashboardRef,
  listSavedPlacesRef,
  listTravelerBookingsRef,
  listTravelerHistoryRef,
} from '@/lib/convex';
import { formatUsdConversion } from '@/lib/currency';
import { useAuthSession } from '@/providers/auth-session';
import type { ProfilePlaceItem, TravelerBookingItem } from '@/types/trip';

import { AdminContentDashboard } from '../manager/admin-content-dashboard';
import { ProfileActivitySummary } from './profile-activity-summary';
import { ProfileHero } from './profile-hero';
import { ProfileSettingsSidebar } from './profile-settings-sidebar';
import { RecentExpeditions } from './recent-expeditions';

type ProfileOverviewScreenProps = {
  showBackButton?: boolean;
};

type ProfileTab = 'gallery' | 'bookings';

const profileTabs = [
  { key: 'gallery', label: 'Gallery' },
  { key: 'bookings', label: 'Bookings' },
] as const;
export function ProfileOverviewScreen({ showBackButton = false }: ProfileOverviewScreenProps) {
  const insets = useSafeAreaInsets();
  const traveler = useCurrentTraveler();
  const settings = useCurrentUserSettings();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? designSystem.semantic.dark : designSystem.semantic.light;
  const { isLargeScreen } = useResponsive();
  const { session } = useAuthSession();
  const isAdmin = session?.role === 'admin';
  const { isManagerMode } = useManagerMode(session?.travelerSlug, isAdmin);
  const { surface: managerSurface } = useManagerResourceMode();
  const [activeTab, setActiveTab] = useState<ProfileTab>('gallery');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const history = useQuery(listTravelerHistoryRef, traveler?.slug ? { travelerSlug: traveler.slug } : 'skip');
  const savedPlaces = useQuery(listSavedPlacesRef, traveler?.slug ? { travelerSlug: traveler.slug } : 'skip');
  const bookings = useQuery(
    listTravelerBookingsRef,
    traveler?.slug ? { travelerSlug: traveler.slug } : 'skip'
  );
  const friendsDashboard = useQuery(
    getFriendsDashboardRef,
    traveler?.slug ? { travelerSlug: traveler.slug } : 'skip'
  );

  const isLoading =
    traveler === undefined ||
    history === undefined ||
    savedPlaces === undefined ||
    bookings === undefined ||
    friendsDashboard === undefined;
  const savedCount = savedPlaces?.length ?? 0;
  const bookingCount = bookings?.length ?? 0;
  const friendCount = friendsDashboard?.stats.friendCount ?? 0;
  const displayName = traveler?.name ?? '';
  const avatarUri = traveler?.avatarUri ?? null;
  const baseLabel = traveler?.countryLabel ?? traveler?.regionName ?? '';
  const rawPlanningLabel = friendsDashboard?.profile?.destinationLabel?.trim() ?? '';
  const planningLabel = rawPlanningLabel || null;
  const galleryItems = buildGalleryItems(history ?? [], savedPlaces ?? []);
  const canUseManagerMode = isAdmin && isManagerMode;

  const mainContent = (
    <>
      {!isLargeScreen ? (
        <WandrHeader
          config={{
            overlay: true,
            leadingAction: showBackButton
              ? { kind: 'back', accessibilityLabel: 'Go back' }
              : { kind: 'menu', accessibilityLabel: 'Open profile settings', onPress: () => setIsSidebarOpen(true) },
          }}
        />
      ) : null}

      <ProfileSettingsSidebar
        avatarUri={avatarUri}
        avatarPaletteKey={traveler?.slug}
        baseLabel={baseLabel}
        isOpen={isSidebarOpen}
        name={traveler?.name ?? 'Traveler'}
        onClose={() => setIsSidebarOpen(false)}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: isLargeScreen ? insets.top + 24 : insets.top + 88,
            paddingBottom: insets.bottom + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <ProfileHero
          avatarUri={avatarUri}
          avatarPaletteKey={traveler?.slug}
          baseLabel={baseLabel}
          displayName={displayName || 'Traveler'}
          planningLabel={planningLabel}
        />
        <ProfileActivitySummary
          addedCount={isLoading ? 0 : bookingCount}
          friendCount={isLoading ? 0 : friendCount}
          savedCount={isLoading ? 0 : savedCount}
        />
        <SegmentedTabs
          options={profileTabs}
          value={activeTab}
          onChange={setActiveTab}
          contentContainerStyle={styles.tabsContent}
          tabStyle={styles.tab}
        />
        {activeTab === 'gallery' ? (
          <ProfileGallery colors={colors} items={isLoading ? [] : galleryItems} />
        ) : (
          <ProfileBookings bookings={isLoading ? [] : bookings ?? []} colors={colors} preferredCurrency={settings?.preferredCurrency ?? 'USD'} />
        )}
      </ScrollView>
    </>
  );

  if (isLargeScreen) {
    return (
      <ThemedView style={styles.root}>
        <LargeScreenWorkspace mapContent={<AppMapWorkspace />}>
          {canUseManagerMode && managerSurface === 'manager' ? (
            <AdminContentDashboard travelerSlug={traveler?.slug} />
          ) : (
            <LargeScreenPanel kind="main">
              {mainContent}
            </LargeScreenPanel>
          )}
        </LargeScreenWorkspace>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.root}>
      {mainContent}
    </ThemedView>
  );
}

export function buildGalleryItems(history: ProfilePlaceItem[], savedPlaces: ProfilePlaceItem[]) {
  const seen = new Set<string>();

  return [...savedPlaces, ...history].filter((item) => {
    const key = `${item.kind}:${item.slug}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

type ProfileSemanticColors = (typeof designSystem.semantic)[keyof typeof designSystem.semantic];

type ProfileGalleryProps = {
  colors: ProfileSemanticColors;
  emptyBody?: string;
  emptyTitle?: string;
  items: ProfilePlaceItem[];
  recentEmptyBody?: string;
  recentEmptyTitle?: string;
  recentTitle?: string;
  subtitle?: string;
  title?: string;
};

export function ProfileGallery({
  colors,
  emptyBody = 'Save places or add bookings and this becomes a visual log of your trips.',
  emptyTitle = 'Your gallery is waiting',
  items,
  recentEmptyBody = 'Save experiences or hidden gems and they will stay here for later.',
  recentEmptyTitle = 'No saved places yet',
  recentTitle = 'Recent places',
  subtitle,
  title = 'Travel gallery',
}: ProfileGalleryProps) {
  if (items.length === 0) {
    return (
      <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
        <ImagesSquare size={22} color={colors.textMuted} weight="duotone" />
        <ThemedText style={styles.emptyTitle}>{emptyTitle}</ThemedText>
        <ThemedText style={styles.emptyBody}>{emptyBody}</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.galleryWrap}>
      <View style={styles.sectionHeader}>
        <View>
          <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>
            {subtitle ?? `${items.length} saved and added places`}
          </ThemedText>
        </View>
      </View>
      <View style={styles.galleryGrid}>
        {items.slice(0, 6).map((item, index) => (
          <GalleryTile colors={colors} index={index} item={item} key={`${item.kind}-${item._id}`} />
        ))}
      </View>
      <RecentExpeditions
        emptyBody={recentEmptyBody}
        emptyTitle={recentEmptyTitle}
        items={items.slice(0, 4)}
        title={recentTitle}
      />
    </View>
  );
}

function GalleryTile({ colors, index, item }: { colors: ProfileSemanticColors; index: number; item: ProfilePlaceItem }) {
  const router = useRouter();
  const isWide = index === 0 || index === 3;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Pressable
      onPress={() => navigateToPlace(router, item)}
      style={[styles.galleryTile, { backgroundColor: colors.surface }, isWide && styles.galleryTileWide]}>
      {item.imageUri ? (
        <ExpoImage source={{ uri: item.imageUri }} style={styles.galleryImage} contentFit="cover" />
      ) : (
        <View style={[styles.galleryPlaceholder, { backgroundColor: colors.surface }]} />
      )}
      <GalleryTitleGlass colors={colors} isDark={isDark}>
        <ThemedText numberOfLines={1} style={styles.galleryTitle}>
          {item.title}
        </ThemedText>
      </GalleryTitleGlass>
    </Pressable>
  );
}

function GalleryTitleGlass({
  children,
  colors,
  isDark,
}: {
  children: React.ReactNode;
  colors: ProfileSemanticColors;
  isDark: boolean;
}) {
  const shouldUseNativeGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();
  const borderColor = isDark ? designSystem.colors.whiteOverlayBarely : designSystem.colors.whiteOverlayBorder;
  const tintColor = isDark ? designSystem.colors.darkGlassHeader : colors.surfaceGlass;

  return (
    <View style={styles.galleryOverlay}>
      {shouldUseNativeGlass ? (
        <GlassView
          style={StyleSheet.absoluteFill}
          glassEffectStyle="clear"
          tintColor={designSystem.colors.transparentWhite}
        />
      ) : Platform.OS === 'ios' ? (
        <BlurView intensity={72} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      ) : null}
      <View
        pointerEvents="none"
        style={[styles.galleryOverlayTint, { backgroundColor: tintColor, borderColor }]}
      />
      <View style={styles.galleryOverlayContent}>{children}</View>
    </View>
  );
}

function ProfileBookings({
  bookings,
  colors,
  preferredCurrency,
}: {
  bookings: TravelerBookingItem[];
  colors: ProfileSemanticColors;
  preferredCurrency: string;
}) {
  const reservations = bookings.filter((booking) => booking.kind === 'stay');
  const experienceItems = bookings.filter((booking) => booking.kind === 'experience');

  if (reservations.length === 0 && experienceItems.length === 0) {
    return (
      <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
        <Ticket size={22} color={colors.textMuted} weight="duotone" />
        <ThemedText style={styles.emptyTitle}>No bookings yet</ThemedText>
        <ThemedText style={styles.emptyBody}>
          Experiences, stays, and requests you make will be gathered here.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.bookingsSection}>
      <View style={styles.sectionHeader}>
        <View>
          <ThemedText style={styles.sectionTitle}>Your bookings</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>Manage rooms and places separately</ThemedText>
        </View>
      </View>
      {reservations.length > 0 ? (
        <BookingGroupSection
          bookings={reservations}
          colors={colors}
          preferredCurrency={preferredCurrency}
          title="Rooms & stays"
        />
      ) : null}
      {experienceItems.length > 0 ? (
        <BookingGroupSection
          bookings={experienceItems}
          colors={colors}
          preferredCurrency={preferredCurrency}
          title="Places & experiences"
        />
      ) : null}
    </View>
  );
}

function BookingGroupSection({
  bookings,
  colors,
  preferredCurrency,
  title,
}: {
  bookings: TravelerBookingItem[];
  colors: ProfileSemanticColors;
  preferredCurrency: string;
  title: string;
}) {
  return (
    <View style={styles.bookingGroup}>
      <View style={styles.bookingGroupHeader}>
        <ThemedText style={styles.bookingGroupTitle}>{title}</ThemedText>
        <ThemedText style={styles.bookingGroupCount}>{bookings.length}</ThemedText>
      </View>
      <View style={styles.bookingList}>
        {bookings.map((booking, index) => (
          <BookingRow
            booking={booking}
            colors={colors}
            key={`${booking.source}-${booking._id}`}
            preferredCurrency={preferredCurrency}
            showDivider={index < bookings.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

function BookingRow({
  booking,
  colors,
  preferredCurrency,
  showDivider,
}: {
  booking: TravelerBookingItem;
  colors: ProfileSemanticColors;
  preferredCurrency: string;
  showDivider: boolean;
}) {
  const router = useRouter();
  const isPending = booking.status === 'pending';
  const dateLabel = getBookingDateLabel(booking);
  const contextLabel = getBookingContextLabel(booking, preferredCurrency);

  return (
    <Pressable
      onPress={() => navigateToBooking(router, booking)}
      style={[
        styles.bookingRow,
        showDivider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSoft },
      ]}>
      {booking.imageUri ? (
        <ExpoImage
          source={{ uri: booking.imageUri }}
          style={[styles.bookingImage, { backgroundColor: colors.surface }]}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.bookingImageFallback, { backgroundColor: colors.surface }]} />
      )}
      <View style={styles.bookingBody}>
        <View style={styles.bookingTopLine}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: designSystem.colors.lime },
              isPending && { backgroundColor: colors.overlay },
            ]}>
            <ThemedText style={[styles.statusText, isPending && { color: colors.textMuted }]}>
              {booking.statusLabel}
            </ThemedText>
          </View>
          <View style={styles.dateLine}>
            <CalendarBlank size={12} color={colors.textSubtle} weight="bold" />
            <ThemedText style={styles.dateText}>{dateLabel}</ThemedText>
          </View>
        </View>
        <ThemedText numberOfLines={2} style={styles.bookingTitle}>
          {booking.title}
        </ThemedText>
        <ThemedText numberOfLines={1} style={styles.bookingSubtitle}>
          {contextLabel}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function getBookingDateLabel(booking: TravelerBookingItem) {
  const formatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });

  if (booking.kind === 'stay' && booking.checkIn) {
    const checkIn = formatter.format(new Date(booking.checkIn));
    const checkOut = booking.checkOut ? formatter.format(new Date(booking.checkOut)) : null;

    return checkOut ? `${checkIn} - ${checkOut}` : checkIn;
  }

  return formatter.format(new Date(booking.bookedAt));
}

function getBookingContextLabel(booking: TravelerBookingItem, preferredCurrency: string) {
  const typeLabel = booking.kind === 'stay' ? 'Room' : 'Place';
  const locationLabel = booking.subtitle;
  const priceLabel = typeof booking.totalPrice === 'number' ? formatUsdConversion(booking.totalPrice, preferredCurrency) : null;
  const parts = [typeLabel, booking.tripName, locationLabel, priceLabel].filter(Boolean);

  return parts.join(' · ');
}

function navigateToPlace(router: ReturnType<typeof useRouter>, item: ProfilePlaceItem) {
  if (item.kind === 'stay') {
    router.push({ pathname: '/stays/details', params: { slug: item.slug } });
    return;
  }

  if (item.kind === 'location' || item.kind === 'hiddenGem') {
    router.push({ pathname: '/explore/hidden-gems/[slug]', params: { slug: item.slug } });
    return;
  }

  router.push({ pathname: '/explore/[slug]', params: { slug: item.slug } });
}

function navigateToBooking(router: ReturnType<typeof useRouter>, booking: TravelerBookingItem) {
  if (booking.kind === 'stay') {
    router.push({ pathname: '/stays/details', params: { slug: booking.slug } });
    return;
  }

  router.push({ pathname: '/explore/[slug]', params: { slug: booking.slug } });
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: 20,
    paddingHorizontal: 20,
  },
  tabsContent: {
    paddingRight: 0,
  },
  tab: {
    minWidth: 118,
  },
  galleryWrap: {
    gap: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: designSystem.colors.mutedText,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  galleryTile: {
    width: '48.4%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 18,
  },
  galleryTileWide: {
    width: '100%',
    aspectRatio: 1.72,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryPlaceholder: {
    flex: 1,
  },
  galleryOverlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: designSystem.radii.pill,
    overflow: 'hidden',
  },
  galleryOverlayTint: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: designSystem.radii.pill,
  },
  galleryOverlayContent: {
    position: 'relative',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  galleryTitle: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  bookingsSection: {
    gap: 18,
  },
  bookingGroup: {
    gap: 10,
  },
  bookingGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookingGroupTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  bookingGroupCount: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.subtleText,
  },
  bookingList: {
    gap: 0,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 12,
  },
  bookingImage: {
    width: 76,
    height: 92,
    borderRadius: 16,
  },
  bookingImageFallback: {
    width: 76,
    height: 92,
    borderRadius: 16,
  },
  bookingBody: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  bookingTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: designSystem.radii.pill,
  },
  statusText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
    textTransform: 'capitalize',
  },
  dateLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.subtleText,
  },
  bookingTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  bookingSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.mutedText,
  },
  emptyState: {
    gap: 8,
    padding: 18,
    borderRadius: 22,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 18,
    color: designSystem.colors.warmDark,
  },
});
