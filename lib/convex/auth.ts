import type { FunctionReference } from 'convex/server';
import { makeFunctionReference } from 'convex/server';

import type { AdminUserRole } from './client';

export const completeOnboardingRef = makeFunctionReference<
  'mutation',
  { name: string; countryCode: string; countryLabel: string; homeCity?: string; travelStyle: 'solo' | 'couple' | 'friends' | 'family' },
  { slug: string; name: string; countryCode: string; countryLabel: string; homeCity: string | null; travelStyle: 'solo' | 'couple' | 'friends' | 'family'; role: AdminUserRole }
>('authSession:completeOnboarding') as FunctionReference<
  'mutation', 'public',
  { name: string; countryCode: string; countryLabel: string; homeCity?: string; travelStyle: 'solo' | 'couple' | 'friends' | 'family' },
  { slug: string; name: string; countryCode: string; countryLabel: string; homeCity: string | null; travelStyle: 'solo' | 'couple' | 'friends' | 'family'; role: AdminUserRole }
>;

export const getCurrentAuthSessionRef = makeFunctionReference<
  'query', Record<string, never>,
  { travelerSlug: string; email: string; name: string; role: AdminUserRole } | null
>('authSession:getCurrentSession') as FunctionReference<
  'query', 'public', Record<string, never>,
  { travelerSlug: string; email: string; name: string; role: AdminUserRole } | null
>;

export const getCurrentAuthIdentityRef = makeFunctionReference<
  'query', Record<string, never>,
  { email: string | null; name: string | null; travelerSlug: string | null; onboardingCompleted: boolean; role: AdminUserRole } | null
>('authSession:getCurrentIdentity') as FunctionReference<
  'query', 'public', Record<string, never>,
  { email: string | null; name: string | null; travelerSlug: string | null; onboardingCompleted: boolean; role: AdminUserRole } | null
>;
