import type { FunctionReference } from 'convex/server';
import { makeFunctionReference } from 'convex/server';

import type { Id } from '@/convex/_generated/dataModel';
import type { SupportChatListPayload, SupportChatPayload } from '@/types/friends';

export const getSupportChatListRef = makeFunctionReference<
  'query', { travelerSlug: string }, SupportChatListPayload
>('support:getSupportChatList') as FunctionReference<'query', 'public', { travelerSlug: string }, SupportChatListPayload>;

export const getSupportChatRef = makeFunctionReference<
  'query', { travelerSlug: string; threadId?: Id<'supportThreads'> }, SupportChatPayload
>('support:getSupportChat') as FunctionReference<'query', 'public', any, SupportChatPayload>;

export const sendSupportMessageRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; body: string; threadId?: Id<'supportThreads'>; replyToMessageId?: Id<'supportMessages'> },
  { threadId: Id<'supportThreads'>; messageId: Id<'supportMessages'> } | null
>('support:sendSupportMessage') as FunctionReference<'mutation', 'public', any, any>;

export const markSupportChatReadRef = makeFunctionReference<
  'mutation', { travelerSlug: string; threadId?: Id<'supportThreads'> }, boolean
>('support:markSupportChatRead') as FunctionReference<'mutation', 'public', any, boolean>;
