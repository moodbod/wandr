import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import schema from '../../convex/schema';

const modules = (import.meta as ImportMeta & {
  glob: (pattern: string) => Record<string, () => Promise<unknown>>;
}).glob('../../convex/**/*.*s');
const CHECK_IN = 1_800_000_000_000;
const CHECK_OUT = CHECK_IN + 2 * 86_400_000;

function createTest() {
  return convexTest({ schema, modules });
}

type TestBackend = ReturnType<typeof createTest>;

async function seedUser(t: TestBackend, slug: string, role: 'traveler' | 'admin' = 'traveler') {
  const userId = await t.run(async (ctx) =>
    ctx.db.insert('users', {
      slug,
      name: slug,
      email: `${slug}@example.com`,
      role,
      countryCode: 'NA',
      countryLabel: 'Namibia',
    })
  );

  return {
    userId,
    client: t.withIdentity({
      subject: `${userId}|session-${slug}`,
      tokenIdentifier: `test|${slug}`,
    }),
  };
}

async function seedExperience(
  t: TestBackend,
  slug: string,
  managerSlug = 'manager'
) {
  return await t.run(async (ctx) =>
    ctx.db.insert('experiences', {
      slug,
      managerSlug,
      itemKind: 'experience',
      badge: 'Experience',
      ctaLabel: 'Request',
      title: slug,
      subtitle: 'Guided stop',
      description: 'Guided stop',
      imageUri: `https://example.com/${slug}.jpg`,
      price: '$120',
      priceSuffix: 'per person',
      locationLabel: 'Namibia',
      includes: ['Guide'],
      status: 'live',
    })
  );
}

async function seedStay(t: TestBackend, slug = 'desert-stay') {
  return await t.run(async (ctx) =>
    ctx.db.insert('stays', {
      slug,
      managerSlug: 'manager',
      name: 'Desert Stay',
      locationLabel: 'Sossusvlei',
      town: 'Sesriem',
      region: 'Hardap',
      coordinate: [15.8, -24.5],
      imageUri: 'https://example.com/stay.jpg',
      galleryImages: ['https://example.com/stay.jpg'],
      pricePerNight: 200,
      currencyCode: 'USD',
      rating: 4.8,
      reviewCount: 12,
      stayStyle: 'lodge',
      routeVibe: 'desert night',
      sleepSignal: 'Quiet desert base',
      summary: 'Quiet desert base',
      idealFor: ['Couples'],
      amenities: ['Breakfast'],
      nearbyHighlights: ['Dunes'],
      bookingProfile: {
        roomOptions: [
          {
            id: 'suite',
            label: 'Suite',
            detail: 'One suite',
            maxAdults: 2,
            maxChildren: 1,
            maxRooms: 1,
            bedOptions: [{ id: 'king', label: 'King' }],
          },
        ],
        arrivalOptions: [{ id: 'afternoon', label: 'Afternoon' }],
        defaultRoomOptionId: 'suite',
        defaultArrivalOptionId: 'afternoon',
      },
      bookingNote: 'Request first',
      status: 'live',
    })
  );
}

function stayDetails(roomCount = 1, specialRequest?: string) {
  return {
    guestCounts: { adults: 2, children: 0 },
    roomCount,
    roomTypeId: 'suite',
    roomTypeLabel: 'Suite',
    bedOptionId: 'king',
    bedOptionLabel: 'King',
    arrivalWindowId: 'afternoon',
    arrivalWindowLabel: 'Afternoon',
    ...(specialRequest ? { specialRequest } : {}),
    guestSummary: '2 adults',
    roomSummary: `${roomCount} suite`,
  };
}

async function makeFriends(t: TestBackend, firstSlug: string, secondSlug: string) {
  await t.run(async (ctx) => {
    await ctx.db.insert('connections', {
      travelerSlug: firstSlug,
      friendSlug: secondSlug,
      createdAt: Date.now(),
      source: 'manual',
    });
    await ctx.db.insert('connections', {
      travelerSlug: secondSlug,
      friendSlug: firstSlug,
      createdAt: Date.now(),
      source: 'manual',
    });
  });
}

async function latestNotification(
  t: TestBackend,
  recipientSlug: string,
  kind: 'friend_invite' | 'trip_invite' | 'trip_join_request'
) {
  return await t.run(async (ctx) => {
    const notices = await ctx.db
      .query('notices')
      .withIndex('by_recipientSlug_and_createdAt', (q) => q.eq('recipientSlug', recipientSlug))
      .order('desc')
      .take(20);
    return notices.find((notice) => notice.kind === kind) ?? null;
  });
}

describe('trip planning foundation', () => {
  it('respects friend profile privacy in discovery and profile reads', async () => {
    const t = createTest();
    const viewer = await seedUser(t, 'viewer');
    const publicTraveler = await seedUser(t, 'public-traveler');
    const friendsOnlyTraveler = await seedUser(t, 'friends-only');
    const privateTraveler = await seedUser(t, 'private-traveler');

    await t.run(async (ctx) => {
      await ctx.db.patch(publicTraveler.userId, { profileVisibility: 'public' });
      await ctx.db.patch(friendsOnlyTraveler.userId, { profileVisibility: 'friends' });
      await ctx.db.patch(privateTraveler.userId, { profileVisibility: 'private' });
    });

    const initialDiscovery = await viewer.client.query(api.friends.getFriendDiscovery, {
      travelerSlug: 'viewer',
    });
    expect(initialDiscovery.candidates.map((candidate) => candidate.travelerSlug)).toContain('public-traveler');
    expect(initialDiscovery.candidates.map((candidate) => candidate.travelerSlug)).not.toContain('friends-only');
    expect(initialDiscovery.candidates.map((candidate) => candidate.travelerSlug)).not.toContain('private-traveler');

    const blockedProfile = await viewer.client.query(api.friends.getFriendViewerProfile, {
      travelerSlug: 'viewer',
      profileSlug: 'friends-only',
    });
    expect(blockedProfile).toBeNull();

    await makeFriends(t, 'viewer', 'friends-only');

    const connectedDiscovery = await viewer.client.query(api.friends.getFriendDiscovery, {
      travelerSlug: 'viewer',
    });
    expect(connectedDiscovery.candidates.map((candidate) => candidate.travelerSlug)).toContain('friends-only');

    const connectedProfile = await viewer.client.query(api.friends.getFriendViewerProfile, {
      travelerSlug: 'viewer',
      profileSlug: 'friends-only',
    });
    expect(connectedProfile?.relationship.state).toBe('friend');

    const blockedRequest = await viewer.client.mutation(api.friends.actOnFriendCandidate, {
      travelerSlug: 'viewer',
      candidateSlug: 'private-traveler',
      action: 'friended',
    });
    expect(blockedRequest.ok).toBe(false);
    expect(await latestNotification(t, 'private-traveler', 'friend_invite')).toBeNull();

    const privateProfile = await viewer.client.query(api.friends.getFriendViewerProfile, {
      travelerSlug: 'viewer',
      profileSlug: 'private-traveler',
    });
    expect(privateProfile).toBeNull();
  });

  it('shares map locations only when location sharing and profile privacy allow it', async () => {
    const t = createTest();
    const viewer = await seedUser(t, 'map-viewer');
    const publicTraveler = await seedUser(t, 'public-map');
    const friendsOnlyTraveler = await seedUser(t, 'friends-map');
    const privateTraveler = await seedUser(t, 'private-map');
    const tripOnlyTraveler = await seedUser(t, 'trip-map');

    await t.run(async (ctx) => {
      await ctx.db.patch(publicTraveler.userId, {
        profileVisibility: 'public',
        locationSharing: 'whileUsing',
      });
      await ctx.db.patch(friendsOnlyTraveler.userId, {
        profileVisibility: 'friends',
        locationSharing: 'whileUsing',
      });
      await ctx.db.patch(privateTraveler.userId, {
        profileVisibility: 'private',
        locationSharing: 'whileUsing',
      });
      await ctx.db.patch(tripOnlyTraveler.userId, {
        profileVisibility: 'public',
        locationSharing: 'tripOnly',
      });
    });

    await publicTraveler.client.mutation(api.sharedLocations.publishSharedLocation, {
      travelerSlug: 'public-map',
      coordinate: [17.08, -22.56],
    });
    await friendsOnlyTraveler.client.mutation(api.sharedLocations.publishSharedLocation, {
      travelerSlug: 'friends-map',
      coordinate: [17.09, -22.57],
    });
    await privateTraveler.client.mutation(api.sharedLocations.publishSharedLocation, {
      travelerSlug: 'private-map',
      coordinate: [17.1, -22.58],
    });
    await tripOnlyTraveler.client.mutation(api.sharedLocations.publishSharedLocation, {
      travelerSlug: 'trip-map',
      coordinate: [17.11, -22.59],
    });

    const publicOnlyLocations = await viewer.client.query(api.sharedLocations.listVisibleSharedLocations, {
      travelerSlug: 'map-viewer',
    });
    expect(publicOnlyLocations.map((location) => location.travelerSlug)).toContain('public-map');
    expect(publicOnlyLocations.map((location) => location.travelerSlug)).not.toContain('friends-map');
    expect(publicOnlyLocations.map((location) => location.travelerSlug)).not.toContain('private-map');
    expect(publicOnlyLocations.map((location) => location.travelerSlug)).not.toContain('trip-map');

    await makeFriends(t, 'map-viewer', 'friends-map');

    const friendsVisibleLocations = await viewer.client.query(api.sharedLocations.listVisibleSharedLocations, {
      travelerSlug: 'map-viewer',
    });
    expect(friendsVisibleLocations.map((location) => location.travelerSlug)).toContain('friends-map');

    await t.run(async (ctx) => {
      const circleId = await ctx.db.insert('circles', {
        slug: 'trip-map-circle',
        name: 'Trip map circle',
        destinationLabel: 'Namibia',
        heroLabel: 'Namibia',
        status: 'active',
        visibility: 'private',
        createdBySlug: 'map-viewer',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert('members', {
        circleId,
        travelerSlug: 'map-viewer',
        role: 'host',
        status: 'active',
        joinedAt: Date.now(),
      });
      await ctx.db.insert('members', {
        circleId,
        travelerSlug: 'trip-map',
        role: 'member',
        status: 'active',
        joinedAt: Date.now(),
      });
    });

    const tripVisibleLocations = await viewer.client.query(api.sharedLocations.listVisibleSharedLocations, {
      travelerSlug: 'map-viewer',
    });
    expect(tripVisibleLocations.map((location) => location.travelerSlug)).toContain('trip-map');

    await publicTraveler.client.mutation(api.profile.updatePrivacySettings, {
      travelerSlug: 'public-map',
      profileVisibility: 'public',
      showSavedPlaces: true,
      showTripActivity: false,
      locationSharing: 'off',
    });

    const afterOffLocations = await viewer.client.query(api.sharedLocations.listVisibleSharedLocations, {
      travelerSlug: 'map-viewer',
    });
    expect(afterOffLocations.map((location) => location.travelerSlug)).not.toContain('public-map');
  });

  it('fails closed for shared map locations when viewer auth is missing or stale', async () => {
    const t = createTest();
    await seedUser(t, 'map-viewer');
    await seedUser(t, 'other-viewer');

    const unauthenticatedLocations = await t.query(api.sharedLocations.listVisibleSharedLocations, {
      travelerSlug: 'map-viewer',
    });
    expect(unauthenticatedLocations).toEqual([]);

    const otherViewer = t.withIdentity({
      subject: 'other-viewer-session',
      tokenIdentifier: 'test|other-viewer',
    });
    const staleSessionLocations = await otherViewer.query(api.sharedLocations.listVisibleSharedLocations, {
      travelerSlug: 'map-viewer',
    });
    expect(staleSessionLocations).toEqual([]);
  });

  it('declines friend requests and joins open friend groups', async () => {
    const t = createTest();
    const host = await seedUser(t, 'host');
    const member = await seedUser(t, 'member');
    const requester = await seedUser(t, 'requester');

    await requester.client.mutation(api.friends.actOnFriendCandidate, {
      travelerSlug: 'requester',
      candidateSlug: 'member',
      action: 'friended',
    });

    const friendInvite = await latestNotification(t, 'member', 'friend_invite');
    expect(friendInvite).not.toBeNull();

    await member.client.mutation(api.friends.rejectFriendRequest, {
      travelerSlug: 'member',
      notificationId: friendInvite!._id,
    });

    const declinedFriendInvite = await t.run((ctx) => ctx.db.get(friendInvite!._id));
    expect(declinedFriendInvite?.actionStatus).toBe('declined');

    const circleId = await host.client.mutation(api.friends.createOpenFriendGroup, {
      travelerSlug: 'host',
      name: 'Open friends',
    });
    const chatListBeforeJoin = await member.client.query(api.friends.getFriendChatList, {
      travelerSlug: 'member',
    });
    expect(chatListBeforeJoin.joinableGroups.map((group) => group.id)).toContain(circleId);

    await member.client.mutation(api.friends.joinFriendCircle, {
      travelerSlug: 'member',
      circleId: circleId!,
    });

    const groupChat = await member.client.query(api.friends.getFriendChat, {
      travelerSlug: 'member',
      circleId: circleId!,
    });
    expect(groupChat?.members.map((groupMember) => groupMember.travelerSlug)).toContain('member');
  });

  it('accepts group invites as linked member trips without cloned bookings and reads host updates', async () => {
    const t = createTest();
    const host = await seedUser(t, 'host');
    const member = await seedUser(t, 'member');
    await makeFriends(t, 'host', 'member');
    await seedExperience(t, 'dune-walk');
    await seedExperience(t, 'sunset-drive');

    const hostTripId = await host.client.mutation(api.trip.createTrip, {
      name: 'Dune trip',
      travelerSlug: 'host',
    });
    const hostBookingId = await host.client.mutation(api.trip.addExperienceToTrip, {
      experienceSlug: 'dune-walk',
      travelerSlug: 'host',
      tripId: hostTripId,
    });
    await host.client.mutation(api.trip.inviteFriendsToTrip, {
      tripId: hostTripId,
      travelerSlug: 'host',
      friendSlugs: ['member'],
    });

    const inviteNotice = await latestNotification(t, 'member', 'trip_invite');
    expect(inviteNotice).not.toBeNull();
    await member.client.mutation(api.friends.acceptTripInvite, {
      travelerSlug: 'member',
      notificationId: inviteNotice!._id,
    });

    const memberTrip = await t.run(async (ctx) => {
      const trips = await ctx.db
        .query('trips')
        .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', 'member'))
        .take(10);
      return trips.find((trip) => trip.circleId);
    });
    expect(memberTrip?.sourceTripId).toBe(hostTripId);

    const memberBookings = await t.run(async (ctx) =>
      ctx.db
        .query('bookings')
        .withIndex('by_tripId', (q) => q.eq('tripId', memberTrip!._id))
        .take(20)
    );
    expect(memberBookings).toHaveLength(0);

    await expect(
      member.client.mutation(api.trip.addExperienceToTrip, {
        experienceSlug: 'sunset-drive',
        travelerSlug: 'member',
        tripId: memberTrip!._id,
      })
    ).rejects.toThrow(/group host/);
    await expect(
      member.client.mutation(api.trip.removeExperienceFromTrip, {
        bookingId: hostBookingId,
        travelerSlug: 'member',
      })
    ).resolves.toBe(false);

    await host.client.mutation(api.trip.addExperienceToTrip, {
      experienceSlug: 'sunset-drive',
      travelerSlug: 'host',
      tripId: hostTripId,
    });
    const dashboard = await member.client.query(api.trip.getTripDashboard, {
      travelerSlug: 'member',
      tripId: memberTrip!._id,
    });

    expect(dashboard.stopCount).toBe(2);
    expect(dashboard.items.map((item) => item.experienceSlug).sort()).toEqual(['dune-walk', 'sunset-drive']);
  });

  it('updates stay requests in place and blocks over-capacity confirmed overlaps', async () => {
    const t = createTest();
    const traveler = await seedUser(t, 'traveler');
    await seedStay(t);

    const tripId = await traveler.client.mutation(api.trip.createTrip, {
      name: 'Stay trip',
      travelerSlug: 'traveler',
    });
    const firstReservationId = await traveler.client.mutation(api.trip.createStayBooking, {
      staySlug: 'desert-stay',
      travelerSlug: 'traveler',
      checkIn: CHECK_IN,
      checkOut: CHECK_OUT,
      totalPrice: 400,
      stayBookingDetails: stayDetails(1, 'Near reception'),
      tripId,
    });
    const secondReservationId = await traveler.client.mutation(api.trip.createStayBooking, {
      staySlug: 'desert-stay',
      travelerSlug: 'traveler',
      checkIn: CHECK_IN + 86_400_000,
      checkOut: CHECK_OUT + 86_400_000,
      totalPrice: 420,
      stayBookingDetails: stayDetails(1, 'Late arrival'),
      tripId,
    });

    expect(secondReservationId).toBe(firstReservationId);
    const stayRows = await t.run(async (ctx) => {
      const reservations = await ctx.db
        .query('reservations')
        .withIndex('by_travelerSlug_and_staySlug_and_bookedAt', (q) =>
          q.eq('travelerSlug', 'traveler').eq('staySlug', 'desert-stay')
        )
        .take(10);
      const mirrors = await ctx.db
        .query('bookings')
        .withIndex('by_reservationId', (q) => q.eq('reservationId', firstReservationId))
        .take(10);
      return { reservations, mirrors };
    });
    expect(stayRows.reservations).toHaveLength(1);
    expect(stayRows.mirrors).toHaveLength(1);
    expect(stayRows.reservations[0].totalPrice).toBe(420);
    expect(stayRows.mirrors[0].totalPrice).toBe(420);

    await t.run(async (ctx) => {
      await ctx.db.insert('reservations', {
        staySlug: 'desert-stay',
        travelerSlug: 'other',
        checkIn: CHECK_IN,
        checkOut: CHECK_OUT,
        status: 'confirmed',
        totalPrice: 400,
        bookedAt: Date.now(),
        tripId,
        roomTypeId: 'suite',
        roomCount: 1,
        stayBookingDetails: stayDetails(1),
      });
    });

    await expect(
      traveler.client.mutation(api.trip.createStayBooking, {
        staySlug: 'desert-stay',
        travelerSlug: 'traveler',
        checkIn: CHECK_IN,
        checkOut: CHECK_OUT,
        totalPrice: 400,
        stayBookingDetails: stayDetails(1),
        tripId,
      })
    ).rejects.toThrow(/fully booked/);
  });

  it('stores experience request details for managers', async () => {
    const t = createTest();
    const traveler = await seedUser(t, 'traveler');
    const manager = await seedUser(t, 'manager', 'admin');
    await seedExperience(t, 'kayak', 'manager');

    const tripId = await traveler.client.mutation(api.trip.createTrip, {
      name: 'Activity trip',
      travelerSlug: 'traveler',
    });
    await traveler.client.mutation(api.trip.addExperienceToTrip, {
      experienceSlug: 'kayak',
      travelerSlug: 'traveler',
      tripId,
      scheduledFor: CHECK_IN,
      partySize: 3,
      travelerNote: 'Vegetarian lunch',
      currencyCode: 'USD',
      priceSnapshot: 120,
    });

    const bookings = await manager.client.query(api.trip.listManagedBookings, {
      managerSlug: 'manager',
      status: 'pending',
    });
    expect(bookings).toHaveLength(1);
    expect(bookings[0]).toMatchObject({
      slug: 'kayak',
      scheduledFor: CHECK_IN,
      partySize: 3,
      travelerNote: 'Vegetarian lunch',
      priceSnapshot: 120,
    });
  });

  it('declines trip invites and join requests', async () => {
    const t = createTest();
    const host = await seedUser(t, 'host');
    const member = await seedUser(t, 'member');
    await makeFriends(t, 'host', 'member');
    await seedExperience(t, 'dune-walk');

    const hostTripId = await host.client.mutation(api.trip.createTrip, {
      name: 'Open trip',
      travelerSlug: 'host',
    });
    await host.client.mutation(api.trip.addExperienceToTrip, {
      experienceSlug: 'dune-walk',
      travelerSlug: 'host',
      tripId: hostTripId,
    });
    await host.client.mutation(api.trip.inviteFriendsToTrip, {
      tripId: hostTripId,
      travelerSlug: 'host',
      friendSlugs: ['member'],
    });

    const inviteNotice = await latestNotification(t, 'member', 'trip_invite');
    await member.client.mutation(api.friends.declineTripInvite, {
      travelerSlug: 'member',
      notificationId: inviteNotice!._id,
    });
    const declinedInvite = await t.run(async (ctx) => {
      const invite = await ctx.db.get(inviteNotice!.entityId as Id<'invites'>);
      const notice = await ctx.db.get(inviteNotice!._id);
      return { invite, notice };
    });
    expect(declinedInvite.invite?.status).toBe('declined');
    expect(declinedInvite.notice?.actionStatus).toBe('declined');

    const circleId = await host.client.mutation(api.friends.createOpenFriendGroup, {
      travelerSlug: 'host',
      name: 'Open trip',
      tripId: hostTripId,
    });
    await member.client.mutation(api.explore.requestJoinExploreTrip, {
      travelerSlug: 'member',
      circleId: circleId!,
      experienceSlug: 'dune-walk',
    });

    const joinNotice = await latestNotification(t, 'host', 'trip_join_request');
    await host.client.mutation(api.friends.declineTripJoinRequest, {
      travelerSlug: 'host',
      notificationId: joinNotice!._id,
    });
    const declinedJoinNotice = await t.run((ctx) => ctx.db.get(joinNotice!._id));
    expect(declinedJoinNotice?.actionStatus).toBe('declined');
  });
});
