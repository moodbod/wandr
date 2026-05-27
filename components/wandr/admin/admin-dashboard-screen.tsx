import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import type React from 'react';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Id } from '@/convex/_generated/dataModel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { AdminContentDashboard } from '@/components/wandr/manager/admin-content-dashboard';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import {
  type AdminRequestSource,
  type AdminRequestStatusFilter,
  type AdminRoleFilter,
  type ProviderReviewStatusFilter,
  type ProviderStatus,
  type ProviderStatusFilter,
  type ProviderType,
  adminGetOverviewRef,
  adminInviteServiceProviderRef,
  adminListAuditEventsRef,
  adminListProviderSubmissionsRef,
  adminListRequestsRef,
  adminListServiceProvidersRef,
  adminListUsersRef,
  adminReviewProviderListingRef,
  adminUpdateServiceProviderStatusRef,
  adminUpdateRequestStatusRef,
  adminUpdateUserRoleRef,
  listManagedLocationPhotosRef,
  updateLocationPhotoStatusRef,
} from '@/lib/convex';
import { useAuthSession } from '@/providers/auth-session';

type AdminSection = 'overview' | 'content' | 'providers' | 'requests' | 'moderation' | 'users' | 'audit';
type PhotoStatusFilter = 'approved' | 'pending' | 'rejected' | 'all';

const sectionOptions: readonly { icon: keyof typeof MaterialCommunityIcons.glyphMap; key: AdminSection; label: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'view-dashboard-outline' },
  { key: 'content', label: 'Content', icon: 'map-marker-multiple-outline' },
  { key: 'providers', label: 'Providers', icon: 'storefront-outline' },
  { key: 'requests', label: 'Requests', icon: 'calendar-check-outline' },
  { key: 'moderation', label: 'Photos', icon: 'image-check-outline' },
  { key: 'users', label: 'Users', icon: 'account-cog-outline' },
  { key: 'audit', label: 'Audit', icon: 'history' },
] as const;

const requestFilters = [
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
] as const;

const photoFilters = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
] as const;

const roleFilters = [
  { key: 'all', label: 'All' },
  { key: 'admin', label: 'Admins' },
  { key: 'serviceProvider', label: 'Providers' },
  { key: 'traveler', label: 'Travelers' },
] as const;

const providerTypeOptions: readonly { key: ProviderType; label: string }[] = [
  { key: 'both', label: 'Both' },
  { key: 'experiences', label: 'Experiences' },
  { key: 'stays', label: 'Stays' },
] as const;

const providerStatusFilters: readonly { key: ProviderStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'invited', label: 'Invited' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
] as const;

const providerSubmissionFilters: readonly { key: ProviderReviewStatusFilter; label: string }[] = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
] as const;

export function AdminDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? designSystem.semantic.dark : designSystem.semantic.light;
  const { isLargeScreen } = useResponsive();
  const { isLoading, session } = useAuthSession();
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const isAdmin = session?.role === 'admin';

  if (isLoading) {
    return (
      <ThemedView style={[styles.centerState, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={designSystem.colors.lime} />
      </ThemedView>
    );
  }

  if (!session) {
    return (
      <AdminAccessState
        body="Sign in to continue."
        ctaLabel="Back to Explore"
        onPress={() => router.replace('/explore')}
        title="Admin access"
      />
    );
  }

  if (!isAdmin) {
    return (
      <AdminAccessState
        body="This account does not have admin access."
        ctaLabel="Back to Profile"
        onPress={() => router.replace('/profile')}
        title="No admin access"
      />
    );
  }

  return (
    <ThemedView style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.shell,
          isLargeScreen ? styles.shellLarge : styles.shellCompact,
          {
            paddingBottom: Math.max(insets.bottom, 14),
            paddingLeft: isLargeScreen ? 92 : 14,
            paddingRight: 14,
            paddingTop: Math.max(insets.top, 14),
          },
        ]}
      >
        {isLargeScreen ? (
          <AdminSideNav activeSection={activeSection} onChange={setActiveSection} />
        ) : (
          <SegmentedTabs
            options={sectionOptions}
            value={activeSection}
            onChange={setActiveSection}
            contentContainerStyle={styles.mobileTabs}
            tabStyle={styles.mobileTab}
          />
        )}
        <View style={[styles.mainPanel, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderSoft }]}>
          <View style={[styles.header, { borderBottomColor: colors.borderSoft }]}>
            <View style={styles.headerText}>
              <ThemedText style={styles.title}>Admin</ThemedText>
              <ThemedText style={styles.subtitle}>{getSectionSubtitle(activeSection)}</ThemedText>
            </View>
          </View>
          <View style={styles.sectionFrame}>
            {activeSection === 'overview' ? <OverviewSection onSelectSection={setActiveSection} /> : null}
            {activeSection === 'content' ? <AdminContentDashboard inPanel={false} travelerSlug={session.travelerSlug} /> : null}
            {activeSection === 'providers' ? <ProvidersSection /> : null}
            {activeSection === 'requests' ? <RequestsSection /> : null}
            {activeSection === 'moderation' ? <ModerationSection travelerSlug={session.travelerSlug} /> : null}
            {activeSection === 'users' ? <UsersSection currentUserSlug={session.travelerSlug} /> : null}
            {activeSection === 'audit' ? <AuditSection /> : null}
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

function AdminAccessState({
  body,
  ctaLabel,
  onPress,
  title,
}: {
  body: string;
  ctaLabel: string;
  onPress: () => void;
  title: string;
}) {
  const isDark = useColorScheme() === 'dark';
  const surfaceColor = isDark ? designSystem.colors.darkSurface : designSystem.colors.surfaceRaised;
  const borderColor = isDark ? designSystem.colors.darkBorderSoft : designSystem.colors.borderSoft;

  return (
    <ThemedView style={styles.centerState}>
      <View style={[styles.accessPanel, { backgroundColor: surfaceColor, borderColor }]}>
        <MaterialCommunityIcons name="shield-lock-outline" size={28} color={designSystem.colors.fern} />
        <ThemedText style={styles.accessTitle}>{title}</ThemedText>
        <ThemedText style={styles.accessBody}>{body}</ThemedText>
        <Pressable accessibilityRole="button" onPress={onPress} style={styles.primaryButton}>
          <ThemedText style={styles.primaryButtonText}>{ctaLabel}</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

function AdminSideNav({
  activeSection,
  onChange,
}: {
  activeSection: AdminSection;
  onChange: (section: AdminSection) => void;
}) {
  const isDark = useColorScheme() === 'dark';
  const activeBackground = isDark ? designSystem.colors.whiteOverlayThin : designSystem.colors.limeMist;
  const surfaceColor = isDark ? designSystem.colors.darkSurface : designSystem.colors.surface;
  const borderColor = isDark ? designSystem.colors.darkBorderSoft : designSystem.colors.borderSoft;

  return (
    <View style={[styles.sideNav, { backgroundColor: surfaceColor, borderColor }]}>
      {sectionOptions.map((item) => {
        const isActive = item.key === activeSection;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            key={item.key}
            onPress={() => onChange(item.key)}
            style={[styles.sideNavItem, isActive && { backgroundColor: activeBackground }]}
          >
            <MaterialCommunityIcons
              name={item.icon}
              size={20}
              color={isActive ? designSystem.colors.fern : designSystem.colors.mutedText}
            />
            <ThemedText style={[styles.sideNavText, isActive && styles.sideNavTextActive]}>{item.label}</ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function OverviewSection({ onSelectSection }: { onSelectSection: (section: AdminSection) => void }) {
  const overview = useQuery(adminGetOverviewRef, {});
  const metrics = useMemo(() => buildOverviewMetrics(overview), [overview]);

  if (overview === undefined) {
    return <LoadingRows />;
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.metricGrid}>
        {metrics.map((metric) => (
          <MetricTile key={metric.label} {...metric} />
        ))}
      </View>
      <View style={styles.overviewGrid}>
        <OverviewAction
          count={overview.requests.pending}
          icon="calendar-clock"
          label="Pending requests"
          onPress={() => onSelectSection('requests')}
        />
        <OverviewAction
          count={overview.photos.pending}
          icon="image-multiple-outline"
          label="Photos to review"
          onPress={() => onSelectSection('moderation')}
        />
        <OverviewAction
          count={overview.users.admins}
          icon="account-key-outline"
          label="Admins"
          onPress={() => onSelectSection('users')}
        />
        <OverviewAction
          count={overview.providers?.submittedListings ?? 0}
          icon="account-clock-outline"
          label="Provider reviews"
          onPress={() => onSelectSection('providers')}
        />
      </View>
      <SectionBlock title="Platform data">
        <PlatformDataGrid overview={overview} />
      </SectionBlock>
      <SectionBlock title="Recent admin activity">
        <AuditRows rows={overview.recentEvents ?? []} />
      </SectionBlock>
    </ScrollView>
  );
}

function RequestsSection() {
  const [statusFilter, setStatusFilter] = useState<AdminRequestStatusFilter>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const requests = useQuery(adminListRequestsRef, { limit: 80, status: statusFilter });
  const updateRequest = useMutation(adminUpdateRequestStatusRef);

  async function updateStatus(request: any, status: 'confirmed' | 'cancelled') {
    setBusyId(request._id);
    try {
      await updateRequest({
        requestId: request._id as Id<'bookings'> | Id<'reservations'>,
        source: request.source as AdminRequestSource,
        status,
      });
    } catch (error) {
      Alert.alert('Request update failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <SegmentedTabs options={requestFilters} value={statusFilter} onChange={setStatusFilter} />
      {requests === undefined ? (
        <LoadingRows />
      ) : requests.page.length === 0 ? (
        <EmptyState label="No requests in this queue." />
      ) : (
        <View style={styles.rowList}>
          {requests.page.map((request: any) => (
            <RequestRow
              busy={busyId === request._id}
              key={`${request.source}-${request._id}`}
              request={request}
              onCancel={() => updateStatus(request, 'cancelled')}
              onConfirm={() => updateStatus(request, 'confirmed')}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function ProvidersSection() {
  const [inviteSearch, setInviteSearch] = useState('');
  const [providerSearch, setProviderSearch] = useState('');
  const [providerType, setProviderType] = useState<ProviderType>('both');
  const [providerStatus, setProviderStatus] = useState<ProviderStatusFilter>('all');
  const [submissionFilter, setSubmissionFilter] = useState<ProviderReviewStatusFilter>('submitted');
  const [businessName, setBusinessName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [directPaymentNotes, setDirectPaymentNotes] = useState('Guests can pay cash or arrange bank transfer directly.');
  const [reviewNote, setReviewNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const users = useQuery(adminListUsersRef, { limit: 24, role: 'all', search: inviteSearch });
  const providers = useQuery(adminListServiceProvidersRef, { limit: 80, status: providerStatus, search: providerSearch });
  const submissions = useQuery(adminListProviderSubmissionsRef, { limit: 80, reviewStatus: submissionFilter });
  const inviteProvider = useMutation(adminInviteServiceProviderRef);
  const updateProviderStatus = useMutation(adminUpdateServiceProviderStatusRef);
  const reviewProviderListing = useMutation(adminReviewProviderListingRef);

  async function inviteUser(user: any) {
    const resolvedBusinessName = businessName.trim() || user.name || user.slug || 'Provider business';
    setBusyId(user.userId);
    try {
      await inviteProvider({
        userId: user.userId as Id<'users'>,
        businessName: resolvedBusinessName,
        providerType,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        contactName: user.name,
        acceptedPaymentModes: ['cash'],
        directPaymentNotes: directPaymentNotes.trim() || undefined,
      });
      setBusinessName('');
      setContactEmail('');
      setContactPhone('');
    } catch (error) {
      Alert.alert('Invite failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function changeProviderStatus(provider: any, status: ProviderStatus) {
    setBusyId(provider._id);
    try {
      await updateProviderStatus({
        businessProfileId: provider._id as Id<'businessProfiles'>,
        status,
      });
    } catch (error) {
      Alert.alert('Provider update failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function reviewSubmission(submission: any, decision: 'approved' | 'rejected') {
    setBusyId(submission._id);
    try {
      await reviewProviderListing({
        kind: submission.kind,
        id: submission._id as Id<'experiences'> | Id<'stays'>,
        decision,
        note: decision === 'rejected' ? reviewNote.trim() || undefined : undefined,
      });
      if (decision === 'rejected') {
        setReviewNote('');
      }
    } catch (error) {
      Alert.alert('Review failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <SectionBlock title="Invite provider">
        <View style={styles.formPanel}>
          <SegmentedTabs options={providerTypeOptions} value={providerType} onChange={setProviderType} />
          <View style={styles.formGrid}>
            <LabeledInput label="User search" onChangeText={setInviteSearch} placeholder="Name, email, or slug" value={inviteSearch} />
            <LabeledInput label="Business name" onChangeText={setBusinessName} placeholder="Fallbacks to user name" value={businessName} />
            <LabeledInput label="Contact email" onChangeText={setContactEmail} placeholder="Optional" value={contactEmail} />
            <LabeledInput label="Phone" onChangeText={setContactPhone} placeholder="Optional" value={contactPhone} />
            <LabeledInput
              label="Cash/direct-pay note"
              multiline
              onChangeText={setDirectPaymentNotes}
              placeholder="How guests pay outside Wandr"
              value={directPaymentNotes}
            />
          </View>
          {users === undefined ? (
            <LoadingRows />
          ) : users.page.length === 0 ? (
            <EmptyState label="No users match this search." />
          ) : (
            <View style={styles.rowList}>
              {users.page.map((user: any) => (
                <InviteUserRow
                  busy={busyId === user.userId}
                  key={user.userId}
                  user={user}
                  onInvite={() => inviteUser(user)}
                />
              ))}
            </View>
          )}
        </View>
      </SectionBlock>

      <SectionBlock title="Provider businesses">
        <View style={styles.toolbar}>
          <TextInput
            accessibilityLabel="Search providers"
            onChangeText={setProviderSearch}
            placeholder="Search providers"
            placeholderTextColor={designSystem.colors.darkMutedText}
            style={styles.searchInput}
            value={providerSearch}
          />
        </View>
        <SegmentedTabs options={providerStatusFilters} value={providerStatus} onChange={setProviderStatus} />
        {providers === undefined ? (
          <LoadingRows />
        ) : providers.page.length === 0 ? (
          <EmptyState label="No provider businesses found." />
        ) : (
          <View style={styles.rowList}>
            {providers.page.map((provider: any) => (
              <ProviderBusinessRow
                busy={busyId === provider._id}
                key={provider._id}
                provider={provider}
                onActivate={() => changeProviderStatus(provider, 'active')}
                onSuspend={() => changeProviderStatus(provider, 'suspended')}
              />
            ))}
          </View>
        )}
      </SectionBlock>

      <SectionBlock title="Listing review">
        <SegmentedTabs options={providerSubmissionFilters} value={submissionFilter} onChange={setSubmissionFilter} />
        <LabeledInput
          label="Rejection note"
          multiline
          onChangeText={setReviewNote}
          placeholder="Only used when rejecting"
          value={reviewNote}
        />
        {submissions === undefined ? (
          <LoadingRows />
        ) : submissions.page.length === 0 ? (
          <EmptyState label="No listings in this queue." />
        ) : (
          <View style={styles.rowList}>
            {submissions.page.map((submission: any) => (
              <ProviderSubmissionRow
                busy={busyId === submission._id}
                key={`${submission.kind}-${submission._id}`}
                submission={submission}
                onApprove={() => reviewSubmission(submission, 'approved')}
                onReject={() => reviewSubmission(submission, 'rejected')}
              />
            ))}
          </View>
        )}
      </SectionBlock>
    </ScrollView>
  );
}

function ModerationSection({ travelerSlug }: { travelerSlug: string }) {
  const [statusFilter, setStatusFilter] = useState<PhotoStatusFilter>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const photos = useQuery(
    listManagedLocationPhotosRef,
    statusFilter === 'all' ? { managerSlug: travelerSlug } : { managerSlug: travelerSlug, status: statusFilter }
  );
  const updatePhoto = useMutation(updateLocationPhotoStatusRef);

  async function updateStatus(photoId: Id<'photos'>, status: 'approved' | 'rejected') {
    setBusyId(photoId);
    try {
      await updatePhoto({ photoId, status });
    } catch (error) {
      Alert.alert('Photo update failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <SegmentedTabs options={photoFilters} value={statusFilter} onChange={setStatusFilter} />
      {photos === undefined ? (
        <LoadingRows />
      ) : photos.length === 0 ? (
        <EmptyState label="No photos in this queue." />
      ) : (
        <View style={styles.photoGrid}>
          {photos.map((photo: any) => (
            <PhotoCard
              busy={busyId === photo.id}
              key={photo.id}
              photo={photo}
              onApprove={() => updateStatus(photo.id, 'approved')}
              onReject={() => updateStatus(photo.id, 'rejected')}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function UsersSection({ currentUserSlug }: { currentUserSlug: string }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<AdminRoleFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const users = useQuery(adminListUsersRef, { limit: 80, role: roleFilter, search });
  const updateUserRole = useMutation(adminUpdateUserRoleRef);

  async function changeRole(user: any) {
    const nextRole = user.role === 'admin' ? 'traveler' : 'admin';
    setBusyId(user.userId);
    try {
      await updateUserRole({ userId: user.userId, role: nextRole });
    } catch (error) {
      Alert.alert('Role update failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.toolbar}>
        <TextInput
          accessibilityLabel="Search users"
          onChangeText={setSearch}
          placeholder="Search users"
          placeholderTextColor={designSystem.colors.darkMutedText}
          style={styles.searchInput}
          value={search}
        />
      </View>
      <SegmentedTabs options={roleFilters} value={roleFilter} onChange={setRoleFilter} />
      {users === undefined ? (
        <LoadingRows />
      ) : users.page.length === 0 ? (
        <EmptyState label="No users found." />
      ) : (
        <View style={styles.rowList}>
          {users.page.map((user: any) => (
            <UserRow
              busy={busyId === user.userId}
              currentUserSlug={currentUserSlug}
              key={user.userId}
              user={user}
              onChangeRole={() => changeRole(user)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function AuditSection() {
  const events = useQuery(adminListAuditEventsRef, { limit: 80 });

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {events === undefined ? (
        <LoadingRows />
      ) : events.page.length === 0 ? (
        <EmptyState label="No audit events yet." />
      ) : (
        <AuditRows rows={events.page} />
      )}
    </ScrollView>
  );
}

function MetricTile({ icon, label, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: number | string }) {
  return (
    <View style={styles.metricTile}>
      <MaterialCommunityIcons name={icon} size={20} color={designSystem.colors.fern} />
      <ThemedText style={styles.metricValue}>{typeof value === 'number' ? formatCount(value) : value}</ThemedText>
      <ThemedText style={styles.metricLabel}>{label}</ThemedText>
    </View>
  );
}

function PlatformDataGrid({ overview }: { overview: any }) {
  const rows = [
    { label: 'Active trips', value: overview.platform?.trips?.active ?? 0 },
    { label: 'Completed trips', value: overview.platform?.trips?.completed ?? 0 },
    { label: 'Group trips', value: overview.platform?.trips?.group ?? 0 },
    { label: 'Trip stops', value: overview.platform?.itinerary?.totalStops ?? 0 },
    { label: 'Stay reservations', value: overview.platform?.itinerary?.stayReservations ?? 0 },
    { label: 'Visited stops', value: overview.platform?.engagement?.visits ?? 0 },
    { label: 'Travelers with visits', value: overview.platform?.engagement?.visitedTravelers ?? 0 },
    { label: 'Groups', value: overview.platform?.engagement?.circles ?? 0 },
    { label: 'Messages', value: overview.platform?.engagement?.messages ?? 0 },
    { label: 'Notifications', value: overview.platform?.engagement?.notices ?? 0 },
    { label: 'Unread notifications', value: overview.platform?.engagement?.unreadNotices ?? 0 },
    { label: 'Content records', value: overview.platform?.content?.all ?? 0 },
    { label: 'Provider businesses', value: overview.providers?.total ?? 0 },
    { label: 'Provider listings', value: (overview.providers?.listings?.experiences ?? 0) + (overview.providers?.listings?.stays ?? 0) },
  ];

  return (
    <View style={styles.platformGrid}>
      {rows.map((row) => (
        <View key={row.label} style={styles.platformCell}>
          <ThemedText style={styles.platformValue}>{formatCount(row.value)}</ThemedText>
          <ThemedText style={styles.platformLabel}>{row.label}</ThemedText>
        </View>
      ))}
    </View>
  );
}

function OverviewAction({
  count,
  icon,
  label,
  onPress,
}: {
  count: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.overviewAction}>
      <MaterialCommunityIcons name={icon} size={22} color={designSystem.colors.fern} />
      <View style={styles.flexText}>
        <ThemedText style={styles.overviewActionLabel}>{label}</ThemedText>
        <ThemedText style={styles.overviewActionMeta}>{formatCount(count)}</ThemedText>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={designSystem.colors.mutedText} />
    </Pressable>
  );
}

function RequestRow({
  busy,
  onCancel,
  onConfirm,
  request,
}: {
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  request: any;
}) {
  return (
    <View style={styles.dataRow}>
      <View style={styles.flexText}>
        <View style={styles.rowTitleLine}>
          <ThemedText numberOfLines={1} style={styles.rowTitle}>{request.title}</ThemedText>
          <StatusPill status={request.status} />
        </View>
        <ThemedText numberOfLines={2} style={styles.rowMeta}>
          {request.travelerSlug} - {request.detailLabel}
        </ThemedText>
        <ThemedText numberOfLines={1} style={styles.rowMeta}>
          {formatDate(request.scheduledFor ?? request.checkIn ?? request.bookedAt)}
        </ThemedText>
      </View>
      <View style={styles.rowActions}>
        <IconAction
          disabled={busy || request.status === 'confirmed'}
          icon="check"
          label="Confirm"
          onPress={onConfirm}
          variant="primary"
        />
        <IconAction
          disabled={busy || request.status === 'cancelled'}
          icon="close"
          label="Cancel"
          onPress={onCancel}
        />
      </View>
    </View>
  );
}

function PhotoCard({
  busy,
  onApprove,
  onReject,
  photo,
}: {
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  photo: any;
}) {
  return (
    <View style={styles.photoCard}>
      <ExpoImage contentFit="cover" source={{ uri: photo.imageUri }} style={styles.photoImage} />
      <View style={styles.photoBody}>
        <View style={styles.rowTitleLine}>
          <ThemedText numberOfLines={1} style={styles.rowTitle}>{photo.locationSlug}</ThemedText>
          <StatusPill status={photo.status} />
        </View>
        <ThemedText numberOfLines={1} style={styles.rowMeta}>{photo.travelerSlug}</ThemedText>
        <View style={styles.rowActions}>
          <IconAction disabled={busy || photo.status === 'approved'} icon="check" label="Approve" onPress={onApprove} variant="primary" />
          <IconAction disabled={busy || photo.status === 'rejected'} icon="close" label="Reject" onPress={onReject} />
        </View>
      </View>
    </View>
  );
}

function UserRow({
  busy,
  currentUserSlug,
  onChangeRole,
  user,
}: {
  busy: boolean;
  currentUserSlug: string;
  onChangeRole: () => void;
  user: any;
}) {
  const isSelf = user.slug === currentUserSlug;

  return (
    <View style={styles.dataRow}>
      <View style={styles.flexText}>
        <View style={styles.rowTitleLine}>
          <ThemedText numberOfLines={1} style={styles.rowTitle}>{user.name}</ThemedText>
          <StatusPill status={user.role} />
        </View>
        <ThemedText numberOfLines={1} style={styles.rowMeta}>{user.email ?? user.slug ?? 'No email'}</ThemedText>
        <ThemedText numberOfLines={1} style={styles.rowMeta}>
          {user.onboardingCompleted ? 'Onboarded' : 'Needs onboarding'} - {formatDate(user.createdAt)}
        </ThemedText>
      </View>
      <IconAction
        disabled={busy || isSelf}
        icon={user.role === 'admin' ? 'account-arrow-down-outline' : 'account-arrow-up-outline'}
        label={user.role === 'admin' ? 'Demote' : 'Promote'}
        onPress={onChangeRole}
      />
    </View>
  );
}

function InviteUserRow({
  busy,
  onInvite,
  user,
}: {
  busy: boolean;
  onInvite: () => void;
  user: any;
}) {
  return (
    <View style={styles.dataRow}>
      <View style={styles.flexText}>
        <View style={styles.rowTitleLine}>
          <ThemedText numberOfLines={1} style={styles.rowTitle}>{user.name}</ThemedText>
          <StatusPill status={user.role} />
        </View>
        <ThemedText numberOfLines={1} style={styles.rowMeta}>{user.email ?? user.slug ?? 'No email'}</ThemedText>
        <ThemedText numberOfLines={1} style={styles.rowMeta}>
          {user.onboardingCompleted ? 'Ready to invite' : 'Needs onboarding first'}
        </ThemedText>
      </View>
      <IconAction
        disabled={busy || !user.onboardingCompleted}
        icon="account-plus-outline"
        label="Invite"
        onPress={onInvite}
        variant="primary"
      />
    </View>
  );
}

function ProviderBusinessRow({
  busy,
  onActivate,
  onSuspend,
  provider,
}: {
  busy: boolean;
  onActivate: () => void;
  onSuspend: () => void;
  provider: any;
}) {
  return (
    <View style={styles.dataRow}>
      <View style={styles.flexText}>
        <View style={styles.rowTitleLine}>
          <ThemedText numberOfLines={1} style={styles.rowTitle}>{provider.businessName}</ThemedText>
          <StatusPill status={provider.status} />
          <StatusPill status={provider.providerType} />
        </View>
        <ThemedText numberOfLines={1} style={styles.rowMeta}>
          {provider.ownerName} - {provider.ownerEmail ?? provider.ownerSlug}
        </ThemedText>
        <ThemedText numberOfLines={2} style={styles.rowMeta}>
          Payments: {(provider.acceptedPaymentModes ?? ['cash']).join(', ')}
          {provider.directPaymentNotes ? ` - ${provider.directPaymentNotes}` : ''}
        </ThemedText>
      </View>
      <View style={styles.rowActions}>
        <IconAction
          disabled={busy || provider.status === 'active'}
          icon="check-circle-outline"
          label="Activate"
          onPress={onActivate}
          variant="primary"
        />
        <IconAction
          disabled={busy || provider.status === 'suspended'}
          icon="pause-circle-outline"
          label="Suspend"
          onPress={onSuspend}
        />
      </View>
    </View>
  );
}

function ProviderSubmissionRow({
  busy,
  onApprove,
  onReject,
  submission,
}: {
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  submission: any;
}) {
  return (
    <View style={styles.dataRow}>
      <View style={styles.flexText}>
        <View style={styles.rowTitleLine}>
          <ThemedText numberOfLines={1} style={styles.rowTitle}>{submission.title}</ThemedText>
          <StatusPill status={submission.kind} />
          <StatusPill status={submission.reviewStatus} />
        </View>
        <ThemedText numberOfLines={1} style={styles.rowMeta}>
          {submission.businessName} - {submission.submittedBySlug ?? submission.slug}
        </ThemedText>
        <ThemedText numberOfLines={1} style={styles.rowMeta}>{formatDate(submission.submittedAt)}</ThemedText>
        {submission.rejectionNote ? (
          <ThemedText numberOfLines={2} style={styles.rowMeta}>{submission.rejectionNote}</ThemedText>
        ) : null}
      </View>
      <View style={styles.rowActions}>
        <IconAction
          disabled={busy || submission.reviewStatus === 'approved'}
          icon="check"
          label="Approve"
          onPress={onApprove}
          variant="primary"
        />
        <IconAction
          disabled={busy || submission.reviewStatus === 'rejected'}
          icon="close"
          label="Reject"
          onPress={onReject}
        />
      </View>
    </View>
  );
}

function LabeledInput({
  label,
  multiline = false,
  onChangeText,
  placeholder,
  value,
}: {
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <View style={[styles.formField, multiline && styles.formFieldWide]}>
      <ThemedText style={styles.formLabel}>{label}</ThemedText>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={designSystem.colors.darkMutedText}
        style={[styles.searchInput, multiline && styles.textAreaInput]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
    </View>
  );
}

function AuditRows({ rows }: { rows: any[] }) {
  if (rows.length === 0) {
    return <EmptyState label="No recent activity." />;
  }

  return (
    <View style={styles.rowList}>
      {rows.map((event) => (
        <View key={event._id} style={styles.auditRow}>
          <MaterialCommunityIcons name="history" size={18} color={designSystem.colors.fern} />
          <View style={styles.flexText}>
            <ThemedText style={styles.rowTitle}>{event.summary}</ThemedText>
            <ThemedText style={styles.rowMeta}>
              {event.actorSlug} - {event.action} - {formatDate(event.createdAt)}
            </ThemedText>
          </View>
        </View>
      ))}
    </View>
  );
}

function SectionBlock({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.sectionBlock}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {children}
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  const isPositive =
    status === 'admin' ||
    status === 'serviceProvider' ||
    status === 'active' ||
    status === 'confirmed' ||
    status === 'approved' ||
    status === 'live';
  const tone =
    isPositive
      ? styles.statusPositive
      : status === 'pending' || status === 'draft' || status === 'invited'
        ? styles.statusPending
        : styles.statusMuted;

  return (
    <View style={[styles.statusPill, tone]}>
      <ThemedText style={[styles.statusText, !isPositive && styles.statusTextMuted]}>{status}</ThemedText>
    </View>
  );
}

function IconAction({
  disabled,
  icon,
  label,
  onPress,
  variant = 'secondary',
}: {
  disabled?: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}) {
  const isPrimary = variant === 'primary';
  const foregroundColor = isPrimary ? designSystem.colors.darkGreen : designSystem.colors.darkText;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.iconAction, isPrimary && styles.iconActionPrimary, disabled && styles.actionDisabled]}
    >
      <MaterialCommunityIcons name={icon} size={17} color={foregroundColor} />
      <ThemedText style={[styles.iconActionText, !isPrimary && styles.iconActionTextSecondary]}>{label}</ThemedText>
    </Pressable>
  );
}

function LoadingRows() {
  return (
    <View style={styles.loadingRows}>
      <ActivityIndicator color={designSystem.colors.lime} />
    </View>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <View style={styles.emptyState}>
      <ThemedText style={styles.emptyText}>{label}</ThemedText>
    </View>
  );
}

function buildOverviewMetrics(overview: any) {
  if (!overview) {
    return [];
  }

  return [
    { label: 'Users', value: overview.users.total, icon: 'account-group-outline' as const },
    { label: 'Admins', value: overview.users.admins, icon: 'shield-account-outline' as const },
    { label: 'Providers', value: overview.providers?.active ?? 0, icon: 'storefront-outline' as const },
    { label: 'Trips', value: overview.platform?.trips?.total ?? 0, icon: 'map-outline' as const },
    { label: 'Distance covered', value: `${formatDistance(overview.platform?.distance?.coveredKm ?? 0)} km`, icon: 'map-marker-distance' as const },
    { label: 'Planned distance', value: `${formatDistance(overview.platform?.distance?.plannedKm ?? 0)} km`, icon: 'routes' as const },
    { label: 'Visits', value: overview.platform?.engagement?.visits ?? 0, icon: 'map-marker-check-outline' as const },
    { label: 'Live content', value: overview.content.locations.live + overview.content.experiences.live + overview.content.stays.live, icon: 'earth' as const },
    { label: 'Drafts', value: overview.content.locations.draft + overview.content.experiences.draft + overview.content.stays.draft, icon: 'file-document-edit-outline' as const },
    { label: 'Pending requests', value: overview.requests.pending, icon: 'calendar-clock' as const },
    { label: 'Provider reviews', value: overview.providers?.submittedListings ?? 0, icon: 'account-clock-outline' as const },
    { label: 'Pending photos', value: overview.photos.pending, icon: 'image-multiple-outline' as const },
    { label: 'Messages', value: overview.platform?.engagement?.messages ?? 0, icon: 'message-text-outline' as const },
    { label: 'Groups', value: overview.platform?.engagement?.circles ?? 0, icon: 'account-multiple-outline' as const },
  ];
}

function getSectionSubtitle(section: AdminSection) {
  if (section === 'overview') return 'Live operations, queues, and platform health.';
  if (section === 'content') return 'Create, edit, publish, and archive travel content.';
  if (section === 'providers') return 'Invite businesses and review provider-submitted listings.';
  if (section === 'requests') return 'Confirm or cancel experience and stay requests.';
  if (section === 'moderation') return 'Approve or reject traveler photos.';
  if (section === 'users') return 'Search users and manage admin roles.';
  return 'Review recent admin actions.';
}

function formatCount(value: number) {
  return Intl.NumberFormat(undefined, { notation: value >= 1000 ? 'compact' : 'standard' }).format(value);
}

function formatDistance(value: number) {
  if (value >= 1000) {
    return Intl.NumberFormat(undefined, { maximumFractionDigits: 1, notation: 'compact' }).format(value);
  }

  return Intl.NumberFormat(undefined, { maximumFractionDigits: value >= 10 ? 0 : 1 }).format(value);
}

function formatDate(value?: number | null) {
  if (!value) {
    return 'No date';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  shell: {
    flex: 1,
    gap: 12,
  },
  shellLarge: {
    flexDirection: 'row',
  },
  shellCompact: {
    flexDirection: 'column',
  },
  sideNav: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 6,
    padding: 8,
    width: 176,
  },
  sideNavItem: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  sideNavText: {
    color: designSystem.colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  sideNavTextActive: {
    color: designSystem.colors.fern,
  },
  mobileTabs: {
    paddingRight: 16,
  },
  mobileTab: {
    minWidth: 108,
  },
  mainPanel: {
    borderRadius: 26,
    borderWidth: 1,
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    padding: 18,
  },
  headerText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  title: {
    color: designSystem.colors.ink,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  subtitle: {
    color: designSystem.colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionFrame: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    gap: 16,
    padding: 18,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricTile: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    gap: 8,
    minWidth: 150,
    padding: 14,
  },
  metricValue: {
    color: designSystem.colors.ink,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    lineHeight: 28,
  },
  metricLabel: {
    color: designSystem.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  overviewAction: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    flexGrow: 1,
    gap: 10,
    minHeight: 70,
    minWidth: 220,
    padding: 12,
  },
  overviewActionLabel: {
    color: designSystem.colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  overviewActionMeta: {
    color: designSystem.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionBlock: {
    gap: 10,
  },
  sectionTitle: {
    color: designSystem.colors.ink,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 19,
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  platformCell: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 150,
    padding: 12,
  },
  platformValue: {
    color: designSystem.colors.ink,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    lineHeight: 22,
  },
  platformLabel: {
    color: designSystem.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 4,
  },
  rowList: {
    gap: 10,
  },
  dataRow: {
    alignItems: 'flex-start',
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    padding: 12,
  },
  auditRow: {
    alignItems: 'flex-start',
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  rowTitleLine: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rowTitle: {
    color: designSystem.colors.ink,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  rowMeta: {
    color: designSystem.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
  },
  rowActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flexText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPositive: {
    backgroundColor: designSystem.colors.lime,
  },
  statusPending: {
    backgroundColor: designSystem.colors.whiteOverlayBarely,
  },
  statusMuted: {
    backgroundColor: designSystem.colors.darkBorderSoft,
  },
  statusText: {
    color: designSystem.colors.darkGreen,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 12,
    textTransform: 'capitalize',
  },
  statusTextMuted: {
    color: designSystem.colors.darkText,
  },
  iconAction: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 10,
  },
  iconActionPrimary: {
    backgroundColor: designSystem.colors.lime,
    borderColor: designSystem.colors.lime,
  },
  iconActionText: {
    color: designSystem.colors.darkGreen,
    fontSize: 12,
    fontWeight: '800',
  },
  iconActionTextSecondary: {
    color: designSystem.colors.darkText,
  },
  actionDisabled: {
    opacity: 0.45,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoCard: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    maxWidth: 360,
    minWidth: 260,
    overflow: 'hidden',
  },
  photoImage: {
    aspectRatio: 16 / 10,
    backgroundColor: designSystem.colors.mapFallback,
    width: '100%',
  },
  photoBody: {
    gap: 8,
    padding: 12,
  },
  formPanel: {
    gap: 12,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  formField: {
    flexGrow: 1,
    gap: 6,
    minWidth: 190,
  },
  formFieldWide: {
    minWidth: 260,
  },
  formLabel: {
    color: designSystem.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 15,
  },
  textAreaInput: {
    minHeight: 82,
    paddingTop: 10,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
    borderRadius: 8,
    borderWidth: 1,
    color: designSystem.colors.darkText,
    flex: 1,
    fontSize: 14,
    minHeight: 44,
    minWidth: 180,
    paddingHorizontal: 12,
  },
  loadingRows: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkBorderSoft,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 140,
    padding: 20,
  },
  emptyText: {
    color: designSystem.colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  accessPanel: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    maxWidth: 360,
    padding: 22,
    width: '100%',
  },
  accessTitle: {
    color: designSystem.colors.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  accessBody: {
    color: designSystem.colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: designSystem.colors.lime,
    borderRadius: 999,
    minHeight: 40,
    justifyContent: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: designSystem.colors.darkGreen,
    fontSize: 13,
    fontWeight: '800',
  },
});
