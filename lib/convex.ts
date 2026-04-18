import type { FunctionReference } from 'convex/server';
import { makeFunctionReference } from 'convex/server';
import { ConvexReactClient } from 'convex/react';

import type { ExplorePageContent } from '@/types/explore';

export const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
export const hasConvexUrl = Boolean(convexUrl);

export const convexClient = convexUrl
  ? new ConvexReactClient(convexUrl, { unsavedChangesWarning: false })
  : null;

export const getExplorePageContentRef = makeFunctionReference<
  'query',
  { slug: string },
  ExplorePageContent | null
>('explore:getPageContent') as FunctionReference<'query', 'public', { slug: string }, ExplorePageContent | null>;
