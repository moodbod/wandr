import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { action, internalMutation, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';

import type { ExploreExperience } from '../constants/explore-content';

type TripItineraryItem = {
  _id: Id<'experienceBookings'>;
  _creationTime: number;
  experienceSlug: string;
  travelerSlug: string;
  tripId?: Id<'trips'>;
  bookedAt: number;
  kind: 'experience' | 'stay';
  experience: ExploreExperience;
  stay?: ReturnType<typeof normalizeStayForTrip> | null;
  checkIn?: number;
  checkOut?: number;
  totalPrice?: number;
  stayBookingDetails?: Doc<'stayBookings'>['stayBookingDetails'];
};

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const PHONE_VERIFICATION_TTL_MS = 10 * 60 * 1000;
const AFRICAS_TALKING_LIVE_SMS_URL = 'https://api.africastalking.com/version1/messaging';
const AFRICAS_TALKING_SANDBOX_SMS_URL = 'https://api.sandbox.africastalking.com/version1/messaging';
const INFOBIP_SMS_URL_PATH = '/sms/3/messages';

export const getCurrentTravelerProfile = query({
  args: {
    travelerSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.travelerSlug) {
      return null;
    }

    const travelerSlug = args.travelerSlug;
    const [user, profile] = await Promise.all([
      ctx.db
        .query('appUsers')
        .withIndex('by_slug', (q) => q.eq('slug', travelerSlug))
        .unique(),
      ctx.db
        .query('travelerProfiles')
        .withIndex('by_slug', (q) => q.eq('travelerSlug', travelerSlug))
        .unique(),
    ]);

    if (!user) {
      return null;
    }

    return {
      slug: user.slug,
      name: user.name,
      countryCode: user.countryCode,
      countryLabel: user.countryLabel,
      phoneNumber: user.phoneNumber ?? null,
      homeCity: user.homeCity ?? null,
      travelStyle: user.travelStyle ?? null,
      onboardingCompletedAt: user.onboardingCompletedAt ?? null,
      avatarUri: profile?.avatarUri ?? null,
      regionCode: profile?.regionCode ?? user.countryCode,
      regionName: profile?.regionName ?? user.countryLabel,
    };
  },
});

function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return digits ? `${hasPlus ? '+' : ''}${digits}` : '';
}

function slugFromNameAndPhone(name: string, phoneNumber: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'traveler';
  const suffix = phoneNumber.replace(/\D/g, '').slice(-6) || `${Date.now()}`;
  return `${base}-${suffix}`;
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function getRandomBytes(length: number) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function getRandomOtpCode() {
  const bytes = getRandomBytes(4);
  const value = new DataView(bytes.buffer).getUint32(0);
  return `${value % 1000000}`.padStart(6, '0');
}

async function hashOtpCode(phoneNumber: string, code: string, salt: string) {
  const payload = new TextEncoder().encode(`${phoneNumber}:${code}:${salt}`);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', payload);
  return toHex(new Uint8Array(digest));
}

function getRandomToken() {
  return toHex(getRandomBytes(32));
}

async function hashVerificationToken(token: string) {
  const payload = new TextEncoder().encode(token);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', payload);
  return toHex(new Uint8Array(digest));
}

async function consumePhoneVerification(ctx: MutationCtx, phoneNumber: string, verificationToken: string) {
  const tokenHash = await hashVerificationToken(verificationToken);
  const verification = await ctx.db
    .query('phoneOtpVerifications')
    .withIndex('by_tokenHash', (q) => q.eq('tokenHash', tokenHash))
    .unique();
  const now = Date.now();

  if (!verification || verification.phoneNumber !== phoneNumber || verification.consumedAt) {
    throw new Error('Verify your phone number first.');
  }

  if (verification.expiresAt <= now) {
    await ctx.db.patch(verification._id, { consumedAt: now });
    throw new Error('Phone verification expired. Request a new code.');
  }

  await ctx.db.patch(verification._id, { consumedAt: now });
}

function getOtpSmsBody(code: string) {
  return `Your Wandr verification code is ${code}. It expires in 5 minutes.`;
}

function encodeBasicAuth(username: string, password: string) {
  return globalThis.btoa(`${username}:${password}`);
}

async function sendOtpWithTwilio(phoneNumber: string, code: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken || (!from && !messagingServiceSid)) {
    return null;
  }

  const body = new URLSearchParams({
    To: phoneNumber,
    Body: getOtpSmsBody(code),
  });

  if (messagingServiceSid) {
    body.set('MessagingServiceSid', messagingServiceSid);
  } else if (from) {
    body.set('From', from);
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${encodeBasicAuth(accountSid, authToken)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Could not send SMS with Twilio (${response.status}). ${responseText}`);
  }

  const responseJson = JSON.parse(responseText);
  return {
    provider: 'twilio',
    status: typeof responseJson.status === 'string' ? responseJson.status : 'sent',
    messageId: typeof responseJson.sid === 'string' ? responseJson.sid : null,
    cost: typeof responseJson.price === 'string' ? responseJson.price : null,
  } as const;
}

async function sendOtpWithInfobip(phoneNumber: string, code: string) {
  const apiKey = process.env.INFOBIP_API_KEY;
  const baseUrl = process.env.INFOBIP_BASE_URL;
  const sender = process.env.INFOBIP_SENDER_ID ?? 'ServiceSMS';

  if (!apiKey || !baseUrl) {
    return null;
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${INFOBIP_SMS_URL_PATH}`, {
    method: 'POST',
    headers: {
      Authorization: `App ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          sender,
          destinations: [{ to: phoneNumber.replace(/^\+/, '') }],
          content: { text: getOtpSmsBody(code) },
        },
      ],
    }),
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Could not send SMS with Infobip (${response.status}). ${responseText}`);
  }

  const responseJson = JSON.parse(responseText);
  const message = responseJson?.messages?.[0];
  return {
    provider: 'infobip',
    status: typeof message?.status?.name === 'string' ? message.status.name : 'sent',
    messageId: typeof message?.messageId === 'string' ? message.messageId : null,
    cost: null,
  } as const;
}

async function sendOtpWithAfricasTalking(phoneNumber: string, code: string) {
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME;
  const senderId = process.env.AFRICASTALKING_SENDER_ID;
  const environment = process.env.AFRICASTALKING_ENV;

  if (!apiKey || !username) {
    return null;
  }

  const body = new URLSearchParams({
    username,
    to: phoneNumber,
    message: getOtpSmsBody(code),
    enqueue: '1',
  });

  if (senderId) {
    body.set('from', senderId);
  }

  const response = await fetch(
    environment === 'sandbox' ? AFRICAS_TALKING_SANDBOX_SMS_URL : AFRICAS_TALKING_LIVE_SMS_URL,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    }
  );
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Could not send SMS with Africa's Talking (${response.status}). ${responseText}`);
  }

  let responseJson: any = null;
  try {
    responseJson = JSON.parse(responseText);
  } catch {
    responseJson = null;
  }

  const recipient = responseJson?.SMSMessageData?.Recipients?.[0];
  const status = typeof recipient?.status === 'string' ? recipient.status : 'sent';

  if (typeof status === 'string' && status.toLowerCase().includes('invalid')) {
    throw new Error('That phone number could not receive an SMS.');
  }

  return {
    provider: 'africastalking',
    status,
    messageId: typeof recipient?.messageId === 'string' ? recipient.messageId : null,
    cost: typeof recipient?.cost === 'string' ? recipient.cost : null,
  } as const;
}

async function sendOtpSms(phoneNumber: string, code: string) {
  const provider = process.env.SMS_PROVIDER?.toLowerCase();

  if (provider === 'dev') {
    return {
      provider: 'dev',
      status: 'dev',
      message: 'SMS_PROVIDER is set to dev.',
    } as const;
  }

  if (provider === 'twilio') {
    const delivery = await sendOtpWithTwilio(phoneNumber, code);
    if (delivery) {
      return delivery;
    }
    throw new Error('Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID.');
  }

  if (provider === 'infobip') {
    const delivery = await sendOtpWithInfobip(phoneNumber, code);
    if (delivery) {
      return delivery;
    }
    throw new Error('Missing INFOBIP_API_KEY or INFOBIP_BASE_URL.');
  }

  if (provider === 'africastalking') {
    const delivery = await sendOtpWithAfricasTalking(phoneNumber, code);
    if (delivery) {
      return delivery;
    }
    throw new Error('Missing AFRICASTALKING_USERNAME or AFRICASTALKING_API_KEY.');
  }

  return (
    (await sendOtpWithInfobip(phoneNumber, code)) ??
    (await sendOtpWithTwilio(phoneNumber, code)) ??
    (await sendOtpWithAfricasTalking(phoneNumber, code)) ?? {
      provider: 'dev',
      status: 'dev',
      message: 'No SMS provider environment variables are set.',
    }
  );
}

export const storeRequestedPhoneOtp = internalMutation({
  args: {
    phoneNumber: v.string(),
    codeHash: v.string(),
    salt: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const recentOtp = await ctx.db
      .query('phoneOtps')
      .withIndex('by_phoneNumber_and_createdAt', (q) => q.eq('phoneNumber', args.phoneNumber))
      .order('desc')
      .first();

    if (recentOtp && !recentOtp.consumedAt && recentOtp.lastSentAt > args.createdAt - OTP_RESEND_COOLDOWN_MS) {
      throw new Error('Please wait a moment before requesting another code.');
    }

    return await ctx.db.insert('phoneOtps', {
      phoneNumber: args.phoneNumber,
      codeHash: args.codeHash,
      salt: args.salt,
      attempts: 0,
      createdAt: args.createdAt,
      expiresAt: args.expiresAt,
      lastSentAt: args.createdAt,
    });
  },
});

export const consumePhoneOtp = internalMutation({
  args: {
    otpId: v.id('phoneOtps'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.otpId, { consumedAt: Date.now() });
  },
});

export const requestPhoneOtp = action({
  args: {
    phoneNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const phoneNumber = normalizePhoneNumber(args.phoneNumber);

    if (!phoneNumber || phoneNumber.length < 8) {
      throw new Error('Enter a valid phone number.');
    }

    const now = Date.now();
    const code = getRandomOtpCode();
    const salt = toHex(getRandomBytes(16));
    const codeHash = await hashOtpCode(phoneNumber, code, salt);
    const expiresAt = now + OTP_TTL_MS;

    const otpId: Id<'phoneOtps'> = await ctx.runMutation(internal.trip.storeRequestedPhoneOtp, {
      phoneNumber,
      codeHash,
      salt,
      createdAt: now,
      expiresAt,
    });

    let delivery: Awaited<ReturnType<typeof sendOtpSms>>;
    try {
      delivery = await sendOtpSms(phoneNumber, code);
    } catch (cause) {
      await ctx.runMutation(internal.trip.consumePhoneOtp, { otpId });
      throw cause;
    }

    return {
      expiresAt,
      devCode: delivery.status === 'dev' ? code : null,
      delivery,
    };
  },
});

export const verifyPhoneOtp = mutation({
  args: {
    phoneNumber: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const phoneNumber = normalizePhoneNumber(args.phoneNumber);
    const code = args.code.replace(/\D/g, '');

    if (!phoneNumber || phoneNumber.length < 8) {
      throw new Error('Enter a valid phone number.');
    }

    if (code.length !== 6) {
      throw new Error('Enter the 6-digit code.');
    }

    const otp = await ctx.db
      .query('phoneOtps')
      .withIndex('by_phoneNumber_and_createdAt', (q) => q.eq('phoneNumber', phoneNumber))
      .order('desc')
      .first();

    if (!otp || otp.consumedAt) {
      throw new Error('Request a new code.');
    }

    const now = Date.now();

    if (otp.expiresAt <= now) {
      await ctx.db.patch(otp._id, { consumedAt: now });
      throw new Error('That code expired. Request a new one.');
    }

    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      await ctx.db.patch(otp._id, { consumedAt: now });
      throw new Error('Too many attempts. Request a new code.');
    }

    const codeHash = await hashOtpCode(phoneNumber, code, otp.salt);

    if (codeHash !== otp.codeHash) {
      const nextAttempts = otp.attempts + 1;
      await ctx.db.patch(
        otp._id,
        nextAttempts >= OTP_MAX_ATTEMPTS ? { attempts: nextAttempts, consumedAt: now } : { attempts: nextAttempts }
      );
      throw new Error('That code is not correct.');
    }

    const verificationToken = getRandomToken();
    const tokenHash = await hashVerificationToken(verificationToken);

    await ctx.db.patch(otp._id, {
      attempts: otp.attempts + 1,
      consumedAt: now,
    });

    await ctx.db.insert('phoneOtpVerifications', {
      phoneNumber,
      tokenHash,
      createdAt: now,
      expiresAt: now + PHONE_VERIFICATION_TTL_MS,
    });

    return { verified: true, verificationToken };
  },
});

export const completePhoneOnboarding = mutation({
  args: {
    phoneNumber: v.string(),
    verificationToken: v.string(),
    name: v.string(),
    countryCode: v.string(),
    countryLabel: v.string(),
    homeCity: v.optional(v.string()),
    travelStyle: v.union(v.literal('solo'), v.literal('couple'), v.literal('friends'), v.literal('family')),
  },
  handler: async (ctx, args) => {
    const phoneNumber = normalizePhoneNumber(args.phoneNumber);
    const name = args.name.trim();
    const homeCity = args.homeCity?.trim();

    if (!phoneNumber || phoneNumber.length < 8) {
      throw new Error('Enter a valid phone number.');
    }

    if (name.length < 2) {
      throw new Error('Enter your name.');
    }

    await consumePhoneVerification(ctx, phoneNumber, args.verificationToken);

    const now = Date.now();
    const existingUser = await ctx.db
      .query('appUsers')
      .withIndex('by_phoneNumber', (q) => q.eq('phoneNumber', phoneNumber))
      .unique();

    const slug = existingUser?.slug ?? slugFromNameAndPhone(name, phoneNumber);

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        name,
        countryCode: args.countryCode,
        countryLabel: args.countryLabel,
        homeCity: homeCity || undefined,
        travelStyle: args.travelStyle,
        onboardingCompletedAt: existingUser.onboardingCompletedAt ?? now,
      });
    } else {
      await ctx.db.insert('appUsers', {
        slug,
        name,
        countryCode: args.countryCode,
        countryLabel: args.countryLabel,
        phoneNumber,
        homeCity: homeCity || undefined,
        travelStyle: args.travelStyle,
        onboardingCompletedAt: now,
      });
    }

    const existingProfile = await ctx.db
      .query('travelerProfiles')
      .withIndex('by_slug', (q) => q.eq('travelerSlug', slug))
      .unique();

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        name,
        regionCode: args.countryCode,
        regionName: homeCity || args.countryLabel,
      });
    } else {
      await ctx.db.insert('travelerProfiles', {
        travelerSlug: slug,
        name,
        regionCode: args.countryCode,
        regionName: homeCity || args.countryLabel,
      });
    }

    const existingFriendProfile = await ctx.db
      .query('friendProfiles')
      .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', slug))
      .unique();

    if (!existingFriendProfile) {
      await ctx.db.insert('friendProfiles', {
        travelerSlug: slug,
        headline: '',
        bio: '',
        baseLabel: homeCity || args.countryLabel,
        destinationLabel: '',
        travelPace: 'balanced',
        vibe: args.travelStyle === 'family' ? 'relaxation' : args.travelStyle === 'friends' ? 'social' : 'culture',
        arrivalWindowLabel: '',
        interests: [],
      });
    }

    return {
      slug,
      name,
      countryCode: args.countryCode,
      countryLabel: args.countryLabel,
      phoneNumber,
      homeCity: homeCity || null,
      travelStyle: args.travelStyle,
    };
  },
});

export const getPhoneAuthSession = mutation({
  args: {
    phoneNumber: v.string(),
    verificationToken: v.string(),
  },
  handler: async (ctx, args) => {
    const phoneNumber = normalizePhoneNumber(args.phoneNumber);

    if (!phoneNumber || phoneNumber.length < 8) {
      throw new Error('Enter a valid phone number.');
    }

    const existingUser = await ctx.db
      .query('appUsers')
      .withIndex('by_phoneNumber', (q) => q.eq('phoneNumber', phoneNumber))
      .unique();

    if (!existingUser) {
      return null;
    }

    await consumePhoneVerification(ctx, phoneNumber, args.verificationToken);

    return {
      slug: existingUser.slug,
      name: existingUser.name,
      countryCode: existingUser.countryCode,
      countryLabel: existingUser.countryLabel,
      phoneNumber,
      homeCity: existingUser.homeCity ?? null,
      travelStyle: existingUser.travelStyle ?? null,
    };
  },
});

async function getFallbackTripId(ctx: QueryCtx, travelerSlug: string) {
  const trips = await ctx.db
    .query('trips')
    .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
    .order('desc')
    .collect();

  return trips[0]?._id;
}

async function getResolvedTrip(ctx: QueryCtx, travelerSlug: string, tripId?: Id<'trips'>) {
  const resolvedTripId = tripId ?? (await getFallbackTripId(ctx, travelerSlug));

  if (!resolvedTripId) {
    return null;
  }

  const trip = await ctx.db.get(resolvedTripId);
  return trip?.travelerSlug === travelerSlug ? trip : null;
}

function isCoordinate(value: readonly number[] | undefined): value is readonly [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

function normalizeStayForTrip(stay: Doc<'stays'>) {
  const coordinate = isCoordinate(stay.coordinate) ? stay.coordinate : ([0, 0] as const);

  return {
    ...stay,
    id: stay.slug,
    coordinate,
    priceLabel: `$${stay.pricePerNight}`,
  };
}

function stayToExperience(stay: ReturnType<typeof normalizeStayForTrip>): ExploreExperience {
  return {
    slug: stay.slug,
    badge: 'Stay',
    ctaLabel: 'View stay',
    title: stay.name,
    subtitle: stay.sleepSignal,
    description: stay.summary,
    imageUri: stay.imageUri,
    price: `$${stay.pricePerNight}`,
    priceSuffix: 'night',
    category: stay.routeVibe,
    countryCode: stay.countryCode,
    countryLabel: stay.countryLabel,
    planningLocationId: stay.planningLocationId,
    coordinate: stay.coordinate,
    geography: { region: stay.region, town: stay.town },
    locationLabel: stay.locationLabel,
    durationLabel: 'Overnight',
    galleryImages: stay.galleryImages,
    includes: stay.amenities,
  };
}

function getItineraryCoordinate(item: TripItineraryItem | null | undefined) {
  return item?.stay?.coordinate ?? item?.experience.coordinate;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceInKm(from: readonly [number, number], to: readonly [number, number]) {
  const earthRadiusKm = 6371;
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const startLat = toRadians(fromLat);
  const endLat = toRadians(toLat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getOrderedRouteStops(
  itinerary: TripItineraryItem[],
  origin: readonly [number, number]
) {
  const withCoordinates = itinerary.filter(
    (item) => isCoordinate(getItineraryCoordinate(item))
  );
  const withoutCoordinates = itinerary.filter((item) => !isCoordinate(getItineraryCoordinate(item)));

  const remaining = [...withCoordinates];
  const ordered: TripItineraryItem[] = [];
  let currentPoint = origin;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = getDistanceInKm(currentPoint, getItineraryCoordinate(remaining[0]) as readonly [number, number]);

    for (let index = 1; index < remaining.length; index += 1) {
      const distance = getDistanceInKm(currentPoint, getItineraryCoordinate(remaining[index]) as readonly [number, number]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    const [nextStop] = remaining.splice(nearestIndex, 1);
    ordered.push(nextStop);
    currentPoint = getItineraryCoordinate(nextStop) as readonly [number, number];
  }

  return [...ordered, ...withoutCoordinates.sort((a, b) => a.bookedAt - b.bookedAt)];
}

function buildDayTitle(locationLabel?: string) {
  if (!locationLabel) {
    return 'Trip Day';
  }

  const firstSegment = locationLabel.split(',')[0]?.trim() ?? locationLabel;
  const firstWord = firstSegment.split(/\s+/)[0]?.trim();

  if (!firstWord) {
    return 'Trip Day';
  }

  return `${firstWord} Day`;
}

async function getFriendSummary(ctx: QueryCtx, travelerSlug: string) {
  const [user, travelerProfile, friendProfile] = await Promise.all([
    ctx.db
      .query('appUsers')
      .withIndex('by_slug', (q) => q.eq('slug', travelerSlug))
      .unique(),
    ctx.db
      .query('travelerProfiles')
      .withIndex('by_slug', (q) => q.eq('travelerSlug', travelerSlug))
      .unique(),
    ctx.db
      .query('friendProfiles')
      .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
      .unique(),
  ]);

  return {
    name: user?.name ?? travelerSlug,
    avatarUri: travelerProfile?.avatarUri ?? null,
    baseLabel: friendProfile?.baseLabel ?? user?.countryLabel ?? 'Traveler',
  };
}

async function getTripGroupDetails(
  ctx: QueryCtx,
  trip: Doc<'trips'>,
  travelerSlug: string
) {
  if (!trip.circleId) {
    return null;
  }

  const circleId = trip.circleId;
  const circle = await ctx.db.get(circleId);
  if (!circle) {
    return null;
  }

  const members = await ctx.db
    .query('friendCircleMembers')
    .withIndex('by_circleId', (q) => q.eq('circleId', circleId))
    .collect();
  const memberProfiles = await Promise.all(
    members.map(async (member) => {
      const summary = await getFriendSummary(ctx, member.travelerSlug);

      return {
        travelerSlug: member.travelerSlug,
        name: summary.name,
        avatarUri: summary.avatarUri,
        baseLabel: summary.baseLabel,
        status: member.status,
        role: member.role,
      };
    })
  );

  return {
    circleId: circle._id,
    name: circle.name,
    destinationLabel: circle.destinationLabel,
    memberCount: members.filter((member) => member.status === 'active').length,
    invitedCount: members.filter((member) => member.status === 'invited').length,
    isHost: members.some(
      (member) => member.travelerSlug === travelerSlug && member.role === 'host' && member.status === 'active'
    ),
    members: memberProfiles,
  };
}

async function getResolvedItinerary(
  ctx: QueryCtx,
  travelerSlug: string,
  tripId?: Id<'trips'>
): Promise<TripItineraryItem[]> {
  const trip = await getResolvedTrip(ctx, travelerSlug, tripId);

  if (!trip) {
    return [];
  }

  let bookingsQuery = ctx.db
    .query('experienceBookings')
    .withIndex('by_travelerSlug_and_experienceSlug', (q) => q.eq('travelerSlug', travelerSlug));

  const bookings = (await bookingsQuery.collect()).filter((b) => b.tripId === trip._id);

  const [allExperiences, allStays, stayBookings] = await Promise.all([
    ctx.db.query('experiences').collect(),
    ctx.db.query('stays').collect(),
    ctx.db
      .query('stayBookings')
      .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
      .collect(),
  ]);

  if (allExperiences.length === 0 && allStays.length === 0) {
    return [];
  }

  if (bookings.length === 0) {
    return [];
  }

  const resolvedItinerary = bookings
    .map<TripItineraryItem | null>((booking) => {
      const experience = allExperiences.find((item) => item.slug === booking.experienceSlug);

      if (experience) {
        return {
          ...booking,
          kind: 'experience',
          experience: experience as ExploreExperience,
        };
      }

      const stay = allStays.find((item) => item.slug === booking.experienceSlug);

      if (!stay) {
        return null;
      }

      const normalizedStay = normalizeStayForTrip(stay);
      const stayBooking = stayBookings
        .filter((item) => item.staySlug === stay.slug)
        .sort((a, b) => b.bookedAt - a.bookedAt)[0];

      return {
        ...booking,
        kind: 'stay',
        experience: stayToExperience(normalizedStay),
        stay: normalizedStay,
        checkIn: stayBooking?.checkIn,
        checkOut: stayBooking?.checkOut,
        totalPrice: stayBooking?.totalPrice,
        stayBookingDetails: stayBooking?.stayBookingDetails,
      };
    })
    .filter((item): item is TripItineraryItem => item !== null);

  const origin = [17.0832, -22.5609] as const;

  return getOrderedRouteStops(resolvedItinerary, origin);
}

export const getUserItinerary = query({
  args: {
    travelerSlug: v.string(),
    tripId: v.optional(v.id('trips')),
  },
  handler: async (ctx, args) => {
    return await getResolvedItinerary(ctx, args.travelerSlug, args.tripId);
  },
});

export const getTripDashboard = query({
  args: {
    travelerSlug: v.string(),
    tripId: v.optional(v.id('trips')),
  },
  handler: async (ctx, args) => {
    const resolvedTrip = await getResolvedTrip(ctx, args.travelerSlug, args.tripId);
    const itinerary = resolvedTrip ? await getResolvedItinerary(ctx, args.travelerSlug, resolvedTrip._id) : [];
    const visits = await ctx.db
      .query('tripVisits')
      .withIndex('by_travelerSlug_and_arrivedAt', (q) => q.eq('travelerSlug', args.travelerSlug))
      .collect();

    const visitByBookingId = new Map(visits.map((visit) => [visit.bookingId, visit]));
    const completedCount = itinerary.reduce(
      (count, item) => count + (visitByBookingId.has(item._id) ? 1 : 0),
      0
    );
    const activeIndex = itinerary.findIndex((item) => !visitByBookingId.has(item._id));
    const progressPercentage =
      itinerary.length > 0 ? Math.round((completedCount / itinerary.length) * 100) : 0;

    const items = itinerary.map((item, index) => {
      const visit = visitByBookingId.get(item._id);
      const isCompleted = Boolean(visit);
      const isActive = activeIndex >= 0 && index === activeIndex;

      return {
        ...item,
        visitedAt: visit?.arrivedAt,
        status: isCompleted
          ? ('completed' as const)
          : isActive
            ? ('active' as const)
            : ('upcoming' as const),
      };
    });

    const activeItem = activeIndex >= 0 ? items[activeIndex] : null;
    const locationItem = activeItem ?? items[items.length - 1] ?? null;
    const baseLocationLabel =
      locationItem?.stay?.locationLabel ?? locationItem?.experience.locationLabel ?? 'Windhoek, NA';
    const centerCoordinate =
      getItineraryCoordinate(locationItem) ??
      ([17.0832, -22.5609] as const);

    return {
      dayTitle: buildDayTitle(baseLocationLabel),
      locationLabel: baseLocationLabel,
      centerCoordinate,
      progressPercentage,
      stopCount: itinerary.length,
      completedCount,
      activeIndex,
      activeItem,
      tripId: resolvedTrip?._id ?? null,
      tripName: resolvedTrip
        ? resolvedTrip.name.toLowerCase() === 'default'
          ? 'My Trip'
          : resolvedTrip.name
        : null,
      visibility: resolvedTrip?.visibility ?? 'private',
      isGroupTrip: Boolean(resolvedTrip?.circleId),
      group: resolvedTrip?.circleId ? await getTripGroupDetails(ctx, resolvedTrip, args.travelerSlug) : null,
      items,
    };
  },
});

export const listUserTrips = query({
  args: { travelerSlug: v.string() },
  handler: async (ctx, args) => {
    const trips = await ctx.db
      .query('trips')
      .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', args.travelerSlug))
      .order('desc')
      .collect();

    const tripsWithPreviews = await Promise.all(
      trips.map(async (trip) => {
        const itinerary = await getResolvedItinerary(ctx, args.travelerSlug, trip._id);
        const previewImage = itinerary[0]?.stay?.imageUri ?? itinerary[0]?.experience.imageUri ?? null;
        const centerCoordinate = itinerary[0] ? getItineraryCoordinate(itinerary[0]) ?? null : null;
        return {
          ...trip,
          name: trip.name.toLowerCase() === 'default' ? 'My Trip' : trip.name,
          visibility: trip.visibility ?? 'private',
          previewImage,
          centerCoordinate,
          isGroupTrip: Boolean(trip.circleId),
        };
      })
    );

    return tripsWithPreviews;
  },
});

export const getTripSettings = query({
  args: {
    travelerSlug: v.string(),
    tripId: v.id('trips'),
  },
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip || trip.travelerSlug !== args.travelerSlug) {
      return null;
    }

    return {
      tripId: trip._id,
      name: trip.name.toLowerCase() === 'default' ? 'My Trip' : trip.name,
      visibility: trip.visibility ?? 'private',
      canChangeVisibility: true,
      isGroupTrip: Boolean(trip.circleId),
      invitedFriendSlugs: [],
      friends: [],
    };
  },
});

export const listTravelerHistory = query({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const visits = await ctx.db
      .query('tripVisits')
      .withIndex('by_travelerSlug_and_arrivedAt', (q) => q.eq('travelerSlug', args.travelerSlug))
      .order('desc')
      .take(50);

    return await Promise.all(
      visits.map(async (visit) => {
        const experience = await ctx.db
          .query('experiences')
          .withIndex('by_slug', (q) => q.eq('slug', visit.experienceSlug))
          .unique();

        return {
          _id: visit._id,
          slug: visit.experienceSlug,
          title: experience?.title ?? visit.experienceSlug,
          subtitle: experience?.locationLabel ?? experience?.subtitle ?? 'Visited place',
          imageUri: experience?.imageUri ?? null,
          createdAt: visit.arrivedAt,
          kind: 'experience' as const,
          tripId: visit.tripId,
        };
      })
    );
  },
});

export const listTravelerBookings = query({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const [experienceBookings, stayBookings, trips] = await Promise.all([
      ctx.db
        .query('experienceBookings')
        .withIndex('by_travelerSlug_and_bookedAt', (q) => q.eq('travelerSlug', args.travelerSlug))
        .order('desc')
        .take(50),
      ctx.db
        .query('stayBookings')
        .withIndex('by_travelerSlug_and_bookedAt', (q) => q.eq('travelerSlug', args.travelerSlug))
        .order('desc')
        .take(50),
      ctx.db
        .query('trips')
        .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', args.travelerSlug))
        .collect(),
    ]);

    const tripNameById = new Map(trips.map((trip) => [trip._id, trip.name]));

    const experiences = await Promise.all(
      experienceBookings.map(async (booking) => {
        const experience = await ctx.db
          .query('experiences')
          .withIndex('by_slug', (q) => q.eq('slug', booking.experienceSlug))
          .unique();

        return {
          _id: booking._id,
          source: 'experienceBooking' as const,
          slug: booking.experienceSlug,
          title: experience?.title ?? booking.experienceSlug,
          subtitle: experience?.locationLabel ?? experience?.subtitle ?? 'Experience booking',
          imageUri: experience?.imageUri ?? null,
          bookedAt: booking.bookedAt,
          kind: 'experience' as const,
          status: 'planned' as const,
          statusLabel: 'Planned',
          tripId: booking.tripId,
          tripName: booking.tripId ? tripNameById.get(booking.tripId) ?? null : null,
        };
      })
    );

    const stays = await Promise.all(
      stayBookings.map(async (booking) => {
        const stay = await ctx.db
          .query('stays')
          .withIndex('by_slug', (q) => q.eq('slug', booking.staySlug))
          .unique();

        return {
          _id: booking._id,
          source: 'stayBooking' as const,
          slug: booking.staySlug,
          title: stay?.name ?? booking.staySlug,
          subtitle: stay?.locationLabel ?? 'Stay booking',
          imageUri: stay?.imageUri ?? null,
          bookedAt: booking.bookedAt,
          kind: 'stay' as const,
          status: booking.status,
          statusLabel: booking.status,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          totalPrice: booking.totalPrice,
          detailLabel: `${Math.max(1, Math.round((booking.checkOut - booking.checkIn) / 86_400_000))} night stay`,
        };
      })
    );

    return [...experiences, ...stays].sort((a, b) => b.bookedAt - a.bookedAt);
  },
});

export const createTrip = mutation({
  args: {
    name: v.string(),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const tripId = await ctx.db.insert('trips', {
      name: args.name,
      travelerSlug: args.travelerSlug,
      createdAt: Date.now(),
      status: 'active',
    });
    return tripId;
  },
});

export const updateTripSettings = mutation({
  args: {
    tripId: v.id('trips'),
    travelerSlug: v.string(),
    name: v.string(),
    visibility: v.union(v.literal('private'), v.literal('public')),
  },
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip || trip.travelerSlug !== args.travelerSlug) {
      return false;
    }

    await ctx.db.patch(args.tripId, {
      name: args.name.trim() || trip.name,
      visibility: args.visibility,
    });

    return true;
  },
});

export const inviteFriendsToTrip = mutation({
  args: {
    tripId: v.id('trips'),
    travelerSlug: v.string(),
    friendSlugs: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip || trip.travelerSlug !== args.travelerSlug) {
      return false;
    }

    const now = Date.now();
    for (const friendSlug of [...new Set(args.friendSlugs)].filter((slug) => slug !== args.travelerSlug)) {
      await ctx.db.insert('tripInvites', {
        tripId: args.tripId,
        inviterSlug: args.travelerSlug,
        inviteeSlug: friendSlug,
        status: 'invited',
        createdAt: now,
      });
    }

    return true;
  },
});

export const addExperienceToTrip = mutation({
  args: {
    experienceSlug: v.string(),
    travelerSlug: v.string(),
    tripId: v.optional(v.id('trips')),
  },
  handler: async (ctx, args) => {
    const resolvedTripId =
      args.tripId ??
      (await getFallbackTripId(ctx, args.travelerSlug)) ??
      (await ctx.db.insert('trips', {
        name: 'My Trip',
        travelerSlug: args.travelerSlug,
        createdAt: Date.now(),
        status: 'active',
      }));

    // Check if already in this trip
    const existing = await ctx.db
      .query('experienceBookings')
      .withIndex('by_travelerSlug_and_experienceSlug', (q) => 
        q.eq('travelerSlug', args.travelerSlug)
      )
      .collect();
    
    const matching = existing.find(b => b.experienceSlug === args.experienceSlug && b.tripId === resolvedTripId);
    if (matching) return matching._id;

    return await ctx.db.insert('experienceBookings', {
      experienceSlug: args.experienceSlug,
      travelerSlug: args.travelerSlug,
      tripId: resolvedTripId,
      bookedAt: Date.now(),
    });
  },
});

export const removeExperienceFromTrip = mutation({
  args: {
    bookingId: v.id('experienceBookings'),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);

    if (!booking || booking.travelerSlug !== args.travelerSlug) {
      return false;
    }

    await ctx.db.delete(args.bookingId);
    return true;
  },
});

export const deleteTrip = mutation({
  args: {
    tripId: v.id('trips'),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);

    if (!trip || trip.travelerSlug !== args.travelerSlug) {
      return false;
    }

    const bookings = await ctx.db
      .query('experienceBookings')
      .withIndex('by_tripId', (q) => q.eq('tripId', args.tripId))
      .collect();

    for (const booking of bookings) {
      if (booking.travelerSlug === args.travelerSlug) {
        await ctx.db.delete(booking._id);
      }
    }

    await ctx.db.delete(args.tripId);
    return true;
  },
});

export const bookStay = mutation({
  args: {
    staySlug: v.string(),
    travelerSlug: v.string(),
    tripId: v.optional(v.id('trips')),
  },
  handler: async (ctx, args) => {
    // Stays are booked using the same experienceBookings table for simplicity in the itinerary
    const existingBooking = await ctx.db
      .query('experienceBookings')
      .withIndex('by_travelerSlug_and_experienceSlug', (q) =>
        q.eq('travelerSlug', args.travelerSlug).eq('experienceSlug', args.staySlug)
      )
      .unique();

    if (existingBooking) {
      if (args.tripId && existingBooking.tripId !== args.tripId) {
        await ctx.db.patch(existingBooking._id, { tripId: args.tripId });
      }
      return existingBooking._id;
    }

    return await ctx.db.insert('experienceBookings', {
      experienceSlug: args.staySlug,
      travelerSlug: args.travelerSlug,
      tripId: args.tripId,
      bookedAt: Date.now(),
    });
  },
});

export const recordTripArrival = mutation({
  args: {
    bookingId: v.id('experienceBookings'),
    travelerSlug: v.string(),
    source: v.union(v.literal('gps'), v.literal('manual')),
    coordinate: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);

    if (!booking || booking.travelerSlug !== args.travelerSlug) {
      return { created: false, experienceSlug: null as string | null };
    }

    const existingVisit = await ctx.db
      .query('tripVisits')
      .withIndex('by_bookingId', (q) => q.eq('bookingId', args.bookingId))
      .unique();

    if (existingVisit) {
      return { created: false, experienceSlug: existingVisit.experienceSlug };
    }

    await ctx.db.insert('tripVisits', {
      bookingId: booking._id,
      tripId: booking.tripId,
      travelerSlug: booking.travelerSlug,
      experienceSlug: booking.experienceSlug,
      arrivedAt: Date.now(),
      arrivalSource: args.source,
      coordinate: args.coordinate,
    });

    return { created: true, experienceSlug: booking.experienceSlug };
  },
});

export const submitExperienceRating = mutation({
  args: {
    experienceSlug: v.string(),
    travelerSlug: v.string(),
    rating: v.number(),
    review: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const review = args.review?.trim();
    const existingRating = await ctx.db
      .query('experienceRatings')
      .withIndex('by_experienceSlug_and_travelerSlug', (q) =>
        q.eq('experienceSlug', args.experienceSlug).eq('travelerSlug', args.travelerSlug)
      )
      .unique();

    if (existingRating) {
      await ctx.db.patch(existingRating._id, {
        rating: args.rating,
        review: review && review.length > 0 ? review : undefined,
        createdAt: Date.now(),
      });

      return existingRating._id;
    }

    return await ctx.db.insert('experienceRatings', {
      experienceSlug: args.experienceSlug,
      travelerSlug: args.travelerSlug,
      rating: args.rating,
      review: review && review.length > 0 ? review : undefined,
      createdAt: Date.now(),
    });
  },
});

export const createStayBooking = mutation({
  args: {
    staySlug: v.string(),
    travelerSlug: v.string(),
    checkIn: v.number(),
    checkOut: v.number(),
    totalPrice: v.number(),
    stayBookingDetails: v.optional(
      v.object({
        guestCounts: v.object({
          adults: v.number(),
          children: v.number(),
        }),
        roomCount: v.number(),
        roomTypeId: v.string(),
        roomTypeLabel: v.string(),
        bedOptionId: v.string(),
        bedOptionLabel: v.string(),
        arrivalWindowId: v.string(),
        arrivalWindowLabel: v.string(),
        specialRequest: v.optional(v.string()),
        guestSummary: v.string(),
        roomSummary: v.string(),
      })
    ),
    tripId: v.optional(v.id('trips')),
  },
  handler: async (ctx, args) => {
    // 1. Create the official property booking
    const bookingId = await ctx.db.insert('stayBookings', {
      staySlug: args.staySlug,
      travelerSlug: args.travelerSlug,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      totalPrice: args.totalPrice,
      status: 'pending',
      bookedAt: Date.now(),
      stayBookingDetails: args.stayBookingDetails,
    });

    // 2. If a tripId is provided, also link it to the trip itinerary
    // This allows the stay to appear on the trip map and branching routes
    if (args.tripId) {
      await ctx.db.insert('experienceBookings', {
        experienceSlug: args.staySlug,
        travelerSlug: args.travelerSlug,
        tripId: args.tripId,
        bookedAt: Date.now(),
      });
    }

    return bookingId;
  },
});

export const listAllStays = query({
  args: {},
  handler: async (ctx) => {
    const stays = await ctx.db.query('stays').collect();
    return stays.map((stay) => ({
      ...stay,
      id: stay.slug,
      priceLabel: `$${stay.pricePerNight}`,
    }));
  },
});

export const getStayBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const stay = await ctx.db
      .query('stays')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();

    return stay ? { ...stay, id: stay.slug, priceLabel: `$${stay.pricePerNight}` } : null;
  },
});

export const getTravelerStayBooking = query({
  args: {
    staySlug: v.string(),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query('stayBookings')
      .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', args.travelerSlug))
      .collect();

    return bookings.find((booking) => booking.staySlug === args.staySlug) ?? null;
  },
});

export const listStayRatings = query({
  args: {
    staySlug: v.string(),
  },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query('stayRatings')
      .withIndex('by_staySlug', (q) => q.eq('staySlug', args.staySlug))
      .order('desc')
      .take(50);

    return await Promise.all(
      ratings.map(async (rating) => {
        const [user, profile] = await Promise.all([
          ctx.db
            .query('appUsers')
            .withIndex('by_slug', (q) => q.eq('slug', rating.travelerSlug))
            .unique(),
          ctx.db
            .query('travelerProfiles')
            .withIndex('by_slug', (q) => q.eq('travelerSlug', rating.travelerSlug))
            .unique(),
        ]);

        return {
          ...rating,
          review: rating.review ?? '',
          travelerName: user?.name ?? rating.travelerSlug,
          travelerAvatarUri: profile?.avatarUri ?? null,
          travelerRegionName: profile?.regionName ?? user?.countryLabel ?? null,
        };
      })
    );
  },
});

export const submitStayRating = mutation({
  args: {
    staySlug: v.string(),
    travelerSlug: v.string(),
    rating: v.number(),
    review: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const review = args.review?.trim();
    const existingRating = await ctx.db
      .query('stayRatings')
      .withIndex('by_staySlug_and_travelerSlug', (q) =>
        q.eq('staySlug', args.staySlug).eq('travelerSlug', args.travelerSlug)
      )
      .unique();

    if (existingRating) {
      await ctx.db.patch(existingRating._id, {
        rating: args.rating,
        review: review && review.length > 0 ? review : undefined,
        createdAt: Date.now(),
      });
      return existingRating._id;
    }

    return await ctx.db.insert('stayRatings', {
      staySlug: args.staySlug,
      travelerSlug: args.travelerSlug,
      rating: args.rating,
      review: review && review.length > 0 ? review : undefined,
      createdAt: Date.now(),
    });
  },
});

export const getStayAvailability = query({
  args: { staySlug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('stayBookings')
      .withIndex('by_staySlug', (q) => q.eq('staySlug', args.staySlug))
      .filter((q) => q.eq(q.field('status'), 'confirmed'))
      .collect();
  },
});
