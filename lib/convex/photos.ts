import type { FunctionReference } from 'convex/server';
import { makeFunctionReference } from 'convex/server';

import type { Id } from '@/convex/_generated/dataModel';

export const generateLocationPhotoUploadUrlRef = makeFunctionReference<'mutation', Record<string, never>, string>(
  'photos:generateUploadUrl'
) as FunctionReference<'mutation', 'public', Record<string, never>, string>;

export const submitLocationPhotoRef = makeFunctionReference<
  'mutation',
  { locationKind: 'location' | 'experience' | 'stay'; locationSlug: string; travelerSlug: string; storageId: Id<'_storage'>; caption?: string },
  Id<'photos'>
>('photos:submitLocationPhoto') as FunctionReference<'mutation', 'public', any, Id<'photos'>>;

export const listLocationPhotosRef = makeFunctionReference<
  'query', { locationKind: 'location' | 'experience' | 'stay'; locationSlug: string }, any[]
>('photos:listLocationPhotos') as FunctionReference<'query', 'public', any, any[]>;

export const listManagedLocationPhotosRef = makeFunctionReference<
  'query', { managerSlug: string; status?: 'approved' | 'pending' | 'rejected' }, any[]
>('photos:listManagedLocationPhotos') as FunctionReference<'query', 'public', any, any[]>;

export const updateLocationPhotoStatusRef = makeFunctionReference<
  'mutation', { photoId: Id<'photos'>; status: 'approved' | 'rejected' }, boolean
>('photos:updateLocationPhotoStatus') as FunctionReference<'mutation', 'public', any, boolean>;
