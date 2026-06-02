import type { FunctionReference } from 'convex/server';
import { makeFunctionReference } from 'convex/server';

import type { Id } from '@/convex/_generated/dataModel';
import type { AdminUserRole, AdminRoleFilter, AdminRequestStatusFilter, AdminRequestSource, ProviderType, ProviderStatus, ProviderStatusFilter, ProviderReviewStatusFilter } from './client';

export const adminGetOverviewRef = makeFunctionReference<'query', Record<string, never>, any>(
  'admin:getOverview'
) as FunctionReference<'query', 'public', Record<string, never>, any>;

export const adminListUsersRef = makeFunctionReference<
  'query', { cursor?: number; limit?: number; role?: AdminRoleFilter; search?: string }, any
>('admin:listUsers') as FunctionReference<'query', 'public', any, any>;

export const adminUpdateUserRoleRef = makeFunctionReference<
  'mutation', { role: AdminUserRole; userId: Id<'users'> }, any
>('admin:updateUserRole') as FunctionReference<'mutation', 'public', any, any>;

export const adminListRequestsRef = makeFunctionReference<
  'query', { cursor?: number; limit?: number; status?: AdminRequestStatusFilter }, any
>('admin:listRequests') as FunctionReference<'query', 'public', any, any>;

export const adminUpdateRequestStatusRef = makeFunctionReference<
  'mutation',
  { requestId: Id<'bookings'> | Id<'reservations'>; source: AdminRequestSource; status: 'confirmed' | 'cancelled' },
  boolean
>('admin:updateRequestStatus') as FunctionReference<'mutation', 'public', any, boolean>;

export const adminListAuditEventsRef = makeFunctionReference<
  'query', { cursor?: number; limit?: number }, any
>('admin:listAuditEvents') as FunctionReference<'query', 'public', any, any>;

export const adminInviteServiceProviderRef = makeFunctionReference<
  'mutation', { userId: Id<'users'>; providerType: ProviderType }, any
>('admin:inviteServiceProvider') as FunctionReference<'mutation', 'public', any, any>;

export const adminListServiceProvidersRef = makeFunctionReference<
  'query', { cursor?: number; limit?: number; status?: ProviderStatusFilter; search?: string }, any
>('admin:listServiceProviders') as FunctionReference<'query', 'public', any, any>;

export const adminUpdateServiceProviderStatusRef = makeFunctionReference<
  'mutation', { businessProfileId: Id<'businessProfiles'>; status: ProviderStatus }, boolean
>('admin:updateServiceProviderStatus') as FunctionReference<'mutation', 'public', any, boolean>;

export const adminListProviderSubmissionsRef = makeFunctionReference<
  'query', { cursor?: number; limit?: number; reviewStatus?: ProviderReviewStatusFilter }, any
>('admin:listProviderSubmissions') as FunctionReference<'query', 'public', any, any>;

export const adminReviewProviderListingRef = makeFunctionReference<
  'mutation',
  { kind: 'experience' | 'stay'; id: Id<'experiences'> | Id<'stays'>; decision: 'approved' | 'rejected'; note?: string },
  boolean
>('admin:reviewProviderListing') as FunctionReference<'mutation', 'public', any, boolean>;
