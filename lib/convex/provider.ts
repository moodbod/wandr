import type { FunctionReference } from 'convex/server';
import { makeFunctionReference } from 'convex/server';

import type { Id } from '@/convex/_generated/dataModel';
import type { AdminRequestStatusFilter } from './client';

export const providerGetMyBusinessProfileRef = makeFunctionReference<'query', Record<string, never>, any>(
  'provider:getMyBusinessProfile'
) as FunctionReference<'query', 'public', Record<string, never>, any>;

export const providerCompleteMyBusinessSetupRef = makeFunctionReference<
  'mutation',
  { acceptedPaymentModes?: ('cash' | 'platform')[]; businessName: string; contactEmail?: string; contactName?: string; contactPhone?: string; directPaymentNotes?: string },
  any
>('provider:completeMyBusinessSetup') as FunctionReference<'mutation', 'public', any, any>;

export const providerListMyListingsRef = makeFunctionReference<'query', Record<string, never>, any>(
  'provider:listMyListings'
) as FunctionReference<'query', 'public', Record<string, never>, any>;

export const providerGenerateImageUploadUrlRef = makeFunctionReference<'mutation', Record<string, never>, string>(
  'provider:generateProviderImageUploadUrl'
) as FunctionReference<'mutation', 'public', Record<string, never>, string>;

export const providerUpsertMyExperienceDraftRef = makeFunctionReference<'mutation', any, any>(
  'provider:upsertMyExperienceDraft'
) as FunctionReference<'mutation', 'public', any, any>;

export const providerSubmitMyExperienceForReviewRef = makeFunctionReference<
  'mutation', { experienceId: Id<'experiences'> }, boolean
>('provider:submitMyExperienceForReview') as FunctionReference<'mutation', 'public', any, boolean>;

export const providerUpsertMyStayDraftRef = makeFunctionReference<'mutation', any, any>(
  'provider:upsertMyStayDraft'
) as FunctionReference<'mutation', 'public', any, any>;

export const providerSubmitMyStayForReviewRef = makeFunctionReference<'mutation', { stayId: Id<'stays'> }, boolean>(
  'provider:submitMyStayForReview'
) as FunctionReference<'mutation', 'public', any, boolean>;

export const providerListMyRequestsRef = makeFunctionReference<
  'query', { status?: AdminRequestStatusFilter }, any[]
>('provider:listMyRequests') as FunctionReference<'query', 'public', any, any[]>;

export const providerUpdateMyRequestStatusRef = makeFunctionReference<
  'mutation',
  { requestId: Id<'bookings'> | Id<'reservations'>; source: 'experienceBooking' | 'stayBooking'; status: 'confirmed' | 'cancelled' },
  boolean
>('provider:updateMyRequestStatus') as FunctionReference<'mutation', 'public', any, boolean>;

export const providerArchiveMyListingRef = makeFunctionReference<
  'mutation', { kind: 'experience' | 'stay'; id: Id<'experiences'> | Id<'stays'> }, boolean
>('provider:archiveMyListing') as FunctionReference<'mutation', 'public', any, boolean>;
