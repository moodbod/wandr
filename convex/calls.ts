"use node";

import { AccessToken, type VideoGrant } from 'livekit-server-sdk';
import { v } from 'convex/values';

import { api, internal } from './_generated/api';
import { action } from './_generated/server';
import type { Id } from './_generated/dataModel';

type FriendCallTokenContext = {
  roomName: string;
  identity: string;
  name: string;
};

type FriendCallTokenResponse = {
  serverUrl: string;
  token: string;
  roomName: string;
} | null;

export const createFriendCallToken = action({
  args: {
    callId: v.id('friendCalls'),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args): Promise<FriendCallTokenResponse> => {
    const currentUser = await ctx.runQuery(api.auth.getCurrentUser, {});
    if (!currentUser?.appUser || currentUser.appUser.slug !== args.travelerSlug) {
      throw new Error('Not authenticated');
    }

    const context: FriendCallTokenContext | null = await ctx.runQuery(internal.friends.getFriendCallTokenContext, {
      callId: args.callId as Id<'friendCalls'>,
      travelerSlug: args.travelerSlug,
    });
    if (!context) {
      return null;
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const serverUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !serverUrl) {
      throw new Error('Missing LIVEKIT_URL, LIVEKIT_API_KEY, or LIVEKIT_API_SECRET.');
    }

    const token: AccessToken = new AccessToken(apiKey, apiSecret, {
      identity: context.identity,
      name: context.name,
      ttl: '30m',
    });
    const grant: VideoGrant = {
      room: context.roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    };
    token.addGrant(grant);

    return {
      serverUrl,
      token: await token.toJwt(),
      roomName: context.roomName,
    };
  },
});
