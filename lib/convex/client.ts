import { ConvexReactClient } from 'convex/react';

export type ContentStatus = 'draft' | 'live' | 'archived';
export type CuratedContentKind = 'location' | 'experience' | 'stay';
export type AdminUserRole = 'traveler' | 'serviceProvider' | 'admin';
export type AdminRoleFilter = AdminUserRole | 'all';
export type AdminRequestStatus = 'pending' | 'confirmed' | 'cancelled';
export type AdminRequestStatusFilter = AdminRequestStatus | 'all';
export type AdminRequestSource = 'experienceBooking' | 'stayBooking';
export type ProviderType = 'experiences' | 'stays' | 'both';
export type ProviderStatus = 'invited' | 'active' | 'suspended';
export type ProviderStatusFilter = ProviderStatus | 'all';
export type ProviderReviewStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type ProviderReviewStatusFilter = ProviderReviewStatus | 'all';

export const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
export const hasConvexUrl = Boolean(convexUrl);

export const convexClient = convexUrl
  ? new ConvexReactClient(convexUrl, { unsavedChangesWarning: false })
  : null;
