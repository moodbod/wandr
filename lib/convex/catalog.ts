import type { FunctionReference } from 'convex/server';
import { makeFunctionReference } from 'convex/server';

import type { Id } from '@/convex/_generated/dataModel';
import type { ContentStatus, CuratedContentKind } from './client';

export const getLiveCatalogRef = makeFunctionReference<
  'query', Record<string, never>,
  { locations: any[]; experiences: any[]; stays: any[]; markers: any[]; updatedAt: number }
>('catalog:getLiveCatalog') as FunctionReference<'query', 'public', Record<string, never>, any>;

export const listManagedCatalogRef = makeFunctionReference<
  'query', { status?: ContentStatus }, any
>('catalog:listManagedCatalog') as FunctionReference<'query', 'public', { status?: ContentStatus }, any>;

export const generateManagedImageUploadUrlRef = makeFunctionReference<'mutation', Record<string, never>, string>(
  'catalog:generateManagedImageUploadUrl'
) as FunctionReference<'mutation', 'public', Record<string, never>, string>;

export const upsertManagedLocationRef = makeFunctionReference<
  'mutation', any, { locationId: Id<'locations'>; slug: string }
>('catalog:upsertManagedLocation') as FunctionReference<'mutation', 'public', any, { locationId: Id<'locations'>; slug: string }>;

export const upsertManagedExperienceRef = makeFunctionReference<
  'mutation', any, { experienceId: Id<'experiences'>; slug: string }
>('catalog:upsertManagedExperience') as FunctionReference<'mutation', 'public', any, { experienceId: Id<'experiences'>; slug: string }>;

export const upsertManagedStayRef = makeFunctionReference<
  'mutation', any, { stayId: Id<'stays'>; roomId: string; slug: string }
>('catalog:upsertManagedStay') as FunctionReference<'mutation', 'public', any, { stayId: Id<'stays'>; roomId: string; slug: string }>;

export const updateManagedContentStatusRef = makeFunctionReference<
  'mutation',
  { kind: CuratedContentKind; id: Id<'locations'> | Id<'experiences'> | Id<'stays'>; status: ContentStatus },
  boolean
>('catalog:updateManagedContentStatus') as FunctionReference<'mutation', 'public', any, boolean>;

export const migrateLegacyContentAsLiveRef = makeFunctionReference<
  'mutation', { limit?: number },
  { locationsCreated: number; experiencesUpdated: number; staysUpdated: number }
>('catalog:migrateLegacyContentAsLive') as FunctionReference<'mutation', 'public', any, any>;
