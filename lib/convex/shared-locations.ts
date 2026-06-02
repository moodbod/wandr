import type { FunctionReference } from 'convex/server';
import { makeFunctionReference } from 'convex/server';

export type SharedUserLocation = {
  travelerSlug: string;
  name: string;
  avatarUri: string | null;
  baseLabel: string;
  coordinate: readonly [number, number];
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  updatedAt: number;
  expiresAt: number;
  locationSharing: 'off' | 'whileUsing' | 'tripOnly';
  profileVisibility: 'friends' | 'public' | 'private';
};

export const publishSharedLocationRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; coordinate: number[]; accuracy?: number; heading?: number; speed?: number },
  { published: boolean }
>('sharedLocations:publishSharedLocation') as FunctionReference<'mutation', 'public', any, { published: boolean }>;

export const clearSharedLocationRef = makeFunctionReference<
  'mutation', { travelerSlug: string }, boolean
>('sharedLocations:clearSharedLocation') as FunctionReference<'mutation', 'public', { travelerSlug: string }, boolean>;

export const listVisibleSharedLocationsRef = makeFunctionReference<
  'query', { travelerSlug: string }, SharedUserLocation[]
>('sharedLocations:listVisibleSharedLocations') as FunctionReference<'query', 'public', { travelerSlug: string }, SharedUserLocation[]>;
