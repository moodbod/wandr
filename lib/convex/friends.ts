import type { FunctionReference } from 'convex/server';
import { makeFunctionReference } from 'convex/server';

import type { Id } from '@/convex/_generated/dataModel';
import type { SupportChatListPayload, SupportChatPayload } from '@/types/friends';

export const getFriendsDashboardRef = makeFunctionReference<'query', { travelerSlug: string }, any>(
  'friends:getFriendsDashboard'
) as FunctionReference<'query', 'public', { travelerSlug: string }, any>;

export const getFriendDiscoveryRef = makeFunctionReference<'query', { travelerSlug: string }, any>(
  'friends:getFriendDiscovery'
) as FunctionReference<'query', 'public', { travelerSlug: string }, any>;

export const getFriendViewerProfileRef = makeFunctionReference<
  'query', { travelerSlug: string; profileSlug: string }, any
>('friends:getFriendViewerProfile') as FunctionReference<'query', 'public', any, any>;

export const trackFriendDiscoveryViewRef = makeFunctionReference<'mutation', { travelerSlug: string }, boolean>(
  'friends:trackFriendDiscoveryView'
) as FunctionReference<'mutation', 'public', { travelerSlug: string }, boolean>;

export const getFriendChatRef = makeFunctionReference<
  'query', { travelerSlug: string; circleId?: Id<'circles'> }, any
>('friends:getFriendChat') as FunctionReference<'query', 'public', any, any>;

export const getFriendChatListRef = makeFunctionReference<'query', { travelerSlug: string }, any>(
  'friends:getFriendChatList'
) as FunctionReference<'query', 'public', { travelerSlug: string }, any>;

export const getHeaderBadgeCountsRef = makeFunctionReference<
  'query', { travelerSlug: string }, { chatUnreadCount: number; notificationUnreadCount: number }
>('friends:getHeaderBadgeCounts') as FunctionReference<'query', 'public', { travelerSlug: string }, { chatUnreadCount: number; notificationUnreadCount: number }>;

export const getDirectChatRef = makeFunctionReference<
  'query', { travelerSlug: string; threadId: Id<'threads'> }, any
>('friends:getDirectChat') as FunctionReference<'query', 'public', any, any>;

export const createOpenFriendGroupRef = makeFunctionReference<
  'mutation', { travelerSlug: string; name?: string; tripId?: Id<'trips'>; inviteeSlugs?: string[] }, Id<'circles'> | null
>('friends:createOpenFriendGroup') as FunctionReference<'mutation', 'public', any, Id<'circles'> | null>;

export const matchFriendContactsRef = makeFunctionReference<
  'query', { travelerSlug: string; phoneNumbers: string[] }, any
>('friends:matchFriendContacts') as FunctionReference<'query', 'public', any, any>;

export const actOnFriendCandidateRef = makeFunctionReference<
  'mutation', { travelerSlug: string; candidateSlug: string; action: 'invited' | 'passed' | 'friended' }, any
>('friends:actOnFriendCandidate') as FunctionReference<'mutation', 'public', any, any>;

export const joinFriendCircleRef = makeFunctionReference<
  'mutation', { travelerSlug: string; circleId: Id<'circles'> }, boolean
>('friends:joinFriendCircle') as FunctionReference<'mutation', 'public', any, boolean>;

export const renameFriendCircleRef = makeFunctionReference<
  'mutation', { travelerSlug: string; circleId: Id<'circles'>; name: string }, boolean
>('friends:renameFriendCircle') as FunctionReference<'mutation', 'public', any, boolean>;

export const leaveFriendCircleRef = makeFunctionReference<
  'mutation', { travelerSlug: string; circleId: Id<'circles'> }, boolean
>('friends:leaveFriendCircle') as FunctionReference<'mutation', 'public', any, boolean>;

export const deleteFriendCircleRef = makeFunctionReference<
  'mutation', { travelerSlug: string; circleId: Id<'circles'> }, boolean
>('friends:deleteFriendCircle') as FunctionReference<'mutation', 'public', any, boolean>;

export const sendFriendMessageRef = makeFunctionReference<
  'mutation', { circleId: Id<'circles'>; travelerSlug: string; body: string; replyToMessageId?: Id<'messages'> }, Id<'messages'> | null
>('friends:sendFriendMessage') as FunctionReference<'mutation', 'public', any, Id<'messages'> | null>;

export const deleteFriendMessageRef = makeFunctionReference<
  'mutation', { messageId: Id<'messages'>; travelerSlug: string }, boolean
>('friends:deleteFriendMessage') as FunctionReference<'mutation', 'public', any, boolean>;

export const markFriendChatReadRef = makeFunctionReference<
  'mutation', { circleId: Id<'circles'>; travelerSlug: string }, boolean
>('friends:markFriendChatRead') as FunctionReference<'mutation', 'public', any, boolean>;

export const shareTripRouteInFriendChatRef = makeFunctionReference<
  'mutation', { circleId: Id<'circles'>; travelerSlug: string }, Id<'messages'>
>('friends:shareTripRouteInFriendChat') as FunctionReference<'mutation', 'public', any, Id<'messages'>>;

export const sendDirectFriendMessageRef = makeFunctionReference<
  'mutation', { threadId: Id<'threads'>; travelerSlug: string; body: string; replyToMessageId?: Id<'dms'> }, Id<'dms'> | null
>('friends:sendDirectFriendMessage') as FunctionReference<'mutation', 'public', any, Id<'dms'> | null>;

export const renameDirectFriendThreadRef = makeFunctionReference<
  'mutation', { threadId: Id<'threads'>; travelerSlug: string; title: string }, boolean
>('friends:renameDirectFriendThread') as FunctionReference<'mutation', 'public', any, boolean>;

export const deleteDirectFriendThreadRef = makeFunctionReference<
  'mutation', { threadId: Id<'threads'>; travelerSlug: string }, boolean
>('friends:deleteDirectFriendThread') as FunctionReference<'mutation', 'public', any, boolean>;

export const deleteDirectFriendMessageRef = makeFunctionReference<
  'mutation', { messageId: Id<'dms'>; travelerSlug: string }, boolean
>('friends:deleteDirectFriendMessage') as FunctionReference<'mutation', 'public', any, boolean>;

export const markDirectChatReadRef = makeFunctionReference<
  'mutation', { threadId: Id<'threads'>; travelerSlug: string }, boolean
>('friends:markDirectChatRead') as FunctionReference<'mutation', 'public', any, boolean>;

export const approveTripJoinRequestRef = makeFunctionReference<
  'mutation', { travelerSlug: string; notificationId: Id<'notices'> }, boolean
>('friends:approveTripJoinRequest') as FunctionReference<'mutation', 'public', any, boolean>;

export const acceptTripInviteRef = makeFunctionReference<
  'mutation', { travelerSlug: string; notificationId: Id<'notices'> }, boolean
>('friends:acceptTripInvite') as FunctionReference<'mutation', 'public', any, boolean>;

export const declineTripInviteRef = makeFunctionReference<
  'mutation', { travelerSlug: string; notificationId: Id<'notices'> }, boolean
>('friends:declineTripInvite') as FunctionReference<'mutation', 'public', any, boolean>;

export const declineTripJoinRequestRef = makeFunctionReference<
  'mutation', { travelerSlug: string; notificationId: Id<'notices'> }, boolean
>('friends:declineTripJoinRequest') as FunctionReference<'mutation', 'public', any, boolean>;

export const acceptFriendRequestRef = makeFunctionReference<
  'mutation', { travelerSlug: string; notificationId: Id<'notices'> }, boolean
>('friends:acceptFriendRequest') as FunctionReference<'mutation', 'public', any, boolean>;

export const rejectFriendRequestRef = makeFunctionReference<
  'mutation', { travelerSlug: string; notificationId: Id<'notices'> }, boolean
>('friends:rejectFriendRequest') as FunctionReference<'mutation', 'public', any, boolean>;
