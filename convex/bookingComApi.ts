export const DEFAULT_BOOKING_COM_API_BASE = 'https://demandapi.booking.com/3.2';

export type BookingComCredentials = {
  affiliateId: string;
  apiBase?: string;
  token: string;
};

export type BookingComRequest = {
  body: string;
  headers: Record<string, string>;
  method: 'POST';
};

export type BookingComCachedAccommodationInput = {
  accommodationId: number;
  slug: string;
  status: 'live' | 'closed' | 'unknown';
  name: string;
  locationLabel: string;
  town: string;
  region: string;
  countryCode?: string;
  countryLabel?: string;
  cityId?: number;
  regionId?: number;
  coordinate: number[];
  imageUri: string;
  galleryImages: string[];
  pricePerNight?: number;
  currencyCode?: string;
  rating?: number;
  reviewCount?: number;
  accommodationType?: string;
  description?: string;
  amenities: string[];
  roomNames: string[];
  paymentMethods: string[];
  policies?: string;
  searchText: string;
  sourceUpdatedAt?: string;
};

export type BookingComAvailabilityProduct = {
  id: string;
  label: string;
  allocation?: unknown;
  currencyCode: string;
  priceTotal: number;
  roomId?: string;
  policies?: unknown;
};

export type BookingComPreview = {
  orderToken: string;
  currencyCode: string;
  totalPrice: number;
  paymentOptions: {
    method: string;
    timing: string;
  }[];
  products: BookingComAvailabilityProduct[];
  policies?: unknown;
};

export type BookingComCreateResult = {
  orderId: string;
  reservationId?: string;
  pincode?: string;
  receiptUrl?: string;
  status: 'pending' | 'booked' | 'unknown';
  sanitizedSnapshot: unknown;
};

export function buildBookingComRequest(credentials: BookingComCredentials, payload: unknown): BookingComRequest {
  return {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${credentials.token}`,
      'Content-Type': 'application/json',
      'X-Affiliate-Id': credentials.affiliateId,
    },
    body: JSON.stringify(payload ?? {}),
  };
}

export function getBookingComCredentials(): BookingComCredentials {
  const token = process.env.BOOKING_COM_API_TOKEN?.trim();
  const affiliateId = process.env.BOOKING_COM_AFFILIATE_ID?.trim();
  if (!token || !affiliateId) {
    throw new Error('Booking.com API credentials are not configured.');
  }

  return {
    token,
    affiliateId,
    apiBase: process.env.BOOKING_COM_API_BASE?.replace(/\/$/, '') || DEFAULT_BOOKING_COM_API_BASE,
  };
}

export async function bookingComPost(path: string, payload: unknown) {
  const credentials = getBookingComCredentials();
  const request = buildBookingComRequest(credentials, payload);
  const response = await fetch(`${credentials.apiBase}${path}`, request);
  const text = await response.text();
  const body = text ? parseJson(text) : null;

  if (!response.ok) {
    const message = getString((body as Record<string, unknown> | null)?.message) ?? `Booking.com API request failed with ${response.status}.`;
    throw new Error(message);
  }

  return body;
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return { raw: value };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getPath(value: unknown, path: readonly string[]) {
  let current = value;
  for (const key of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function getArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function compactStrings(values: unknown[], limit = 24) {
  const seen = new Set<string>();
  return values
    .map(getString)
    .filter((value): value is string => Boolean(value))
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getLocalizedName(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return getString(value);
  }
  if (!isRecord(value)) {
    return undefined;
  }
  return getString(value.name) ?? getString(value.translated) ?? getString(value.value) ?? getString(value['en-gb']);
}

function getCountryCode(raw: unknown) {
  return (
    getString(getPath(raw, ['location', 'country_code'])) ??
    getString(getPath(raw, ['location', 'country'])) ??
    getString(getPath(raw, ['country_code'])) ??
    getString(getPath(raw, ['country']))
  )?.toUpperCase();
}

function getCoordinate(raw: unknown) {
  const latitude =
    getNumber(getPath(raw, ['location', 'coordinates', 'latitude'])) ??
    getNumber(getPath(raw, ['location', 'latitude'])) ??
    getNumber(getPath(raw, ['coordinates', 'latitude'])) ??
    getNumber(getPath(raw, ['latitude']));
  const longitude =
    getNumber(getPath(raw, ['location', 'coordinates', 'longitude'])) ??
    getNumber(getPath(raw, ['location', 'longitude'])) ??
    getNumber(getPath(raw, ['coordinates', 'longitude'])) ??
    getNumber(getPath(raw, ['longitude']));

  if (latitude === undefined || longitude === undefined) {
    return [0, 0];
  }

  return [longitude, latitude];
}

function getPhotoUrl(photo: unknown) {
  return (
    getString(photo) ??
    getString(getPath(photo, ['url'])) ??
    getString(getPath(photo, ['large_url'])) ??
    getString(getPath(photo, ['main_photo_url'])) ??
    getString(getPath(photo, ['urls', 'large'])) ??
    getString(getPath(photo, ['urls', 'original']))
  );
}

function getPriceTotal(raw: unknown) {
  return (
    getNumber(getPath(raw, ['price', 'total'])) ??
    getNumber(getPath(raw, ['price', 'book'])) ??
    getNumber(getPath(raw, ['price', 'gross'])) ??
    getNumber(getPath(raw, ['price', 'base'])) ??
    0
  );
}

function getCurrencyCode(raw: unknown) {
  return (
    getString(getPath(raw, ['price', 'currency'])) ??
    getString(getPath(raw, ['currency'])) ??
    'USD'
  ).toUpperCase();
}

export function normalizeAccommodation(raw: unknown, syncedAt = Date.now()): BookingComCachedAccommodationInput | null {
  const id = getNumber(getPath(raw, ['id'])) ?? getNumber(getPath(raw, ['accommodation']));
  const name = getString(getPath(raw, ['name'])) ?? getString(getPath(raw, ['title']));

  if (!id || !name) {
    return null;
  }

  const locationName =
    getString(getPath(raw, ['location', 'name'])) ??
    getString(getPath(raw, ['location', 'address'])) ??
    getString(getPath(raw, ['address'])) ??
    'Booking.com accommodation';
  const city =
    getString(getPath(raw, ['location', 'city'])) ??
    getString(getPath(raw, ['city'])) ??
    getString(getPath(raw, ['city_name'])) ??
    locationName;
  const region =
    getString(getPath(raw, ['location', 'region'])) ??
    getString(getPath(raw, ['region'])) ??
    getString(getPath(raw, ['district'])) ??
    city;
  const countryLabel =
    getString(getPath(raw, ['location', 'country_name'])) ??
    getString(getPath(raw, ['country_name'])) ??
    getString(getPath(raw, ['location', 'country']));
  const photos = getArray(getPath(raw, ['photos'])).map(getPhotoUrl).filter((url): url is string => Boolean(url));
  const imageUri = photos[0] ?? 'https://cf.bstatic.com/static/img/default_property_photo.png';
  const facilities = compactStrings(
    getArray(getPath(raw, ['facilities'])).map((facility) => getLocalizedName(facility) ?? getString(getPath(facility, ['name'])))
  );
  const roomNames = compactStrings(
    getArray(getPath(raw, ['rooms'])).map((room) => getLocalizedName(room) ?? getString(getPath(room, ['name'])) ?? getString(getPath(room, ['room_name'])))
  );
  const paymentMethods = compactStrings(
    getArray(getPath(raw, ['payment', 'methods'])).map((method) => getLocalizedName(method) ?? getString(method))
  );
  const description =
    getString(getPath(raw, ['description'])) ??
    getString(getPath(raw, ['description', 'text'])) ??
    getString(getPath(raw, ['summary']));
  const coordinate = getCoordinate(raw);
  const statusValue = getString(getPath(raw, ['status']))?.toLowerCase();
  const status = statusValue === 'closed' ? 'closed' : 'live';
  const accommodationType =
    getString(getPath(raw, ['type'])) ??
    getString(getPath(raw, ['accommodation_type'])) ??
    getString(getPath(raw, ['category']));
  const cityId = getNumber(getPath(raw, ['location', 'city_id'])) ?? getNumber(getPath(raw, ['city']));
  const regionId = getNumber(getPath(raw, ['location', 'region_id'])) ?? getNumber(getPath(raw, ['region']));
  const rating = getNumber(getPath(raw, ['review_score'])) ?? getNumber(getPath(raw, ['review_scores', 'overall'])) ?? getNumber(getPath(raw, ['rating']));
  const reviewCount = getNumber(getPath(raw, ['review_count'])) ?? getNumber(getPath(raw, ['reviews', 'count']));
  const currencyCode = getString(getPath(raw, ['currency']))?.toUpperCase();
  const pricePerNight = getNumber(getPath(raw, ['price', 'base']));
  const policies = getString(getPath(raw, ['policies', 'description'])) ?? getString(getPath(raw, ['policies']));
  const searchText = [
    name,
    locationName,
    city,
    region,
    countryLabel,
    accommodationType,
    description,
    facilities.join(' '),
    roomNames.join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return {
    accommodationId: id,
    slug: `booking-com-${Math.round(id)}-${slugify(name)}`,
    status,
    name,
    locationLabel: locationName,
    town: city,
    region,
    countryCode: getCountryCode(raw),
    countryLabel,
    cityId,
    regionId,
    coordinate,
    imageUri,
    galleryImages: photos.slice(0, 12),
    pricePerNight,
    currencyCode,
    rating,
    reviewCount,
    accommodationType,
    description,
    amenities: facilities,
    roomNames,
    paymentMethods,
    policies,
    searchText,
    sourceUpdatedAt: getString(getPath(raw, ['updated'])) ?? getString(getPath(raw, ['last_change'])),
  };
}

export function normalizeAccommodationsResponse(response: unknown, syncedAt = Date.now()) {
  const data = getArray(getPath(response, ['data']));
  return data
    .map((item) => normalizeAccommodation(item, syncedAt))
    .filter((item): item is BookingComCachedAccommodationInput => Boolean(item));
}

export function normalizeAvailabilityResponse(response: unknown): BookingComAvailabilityProduct[] {
  const products: BookingComAvailabilityProduct[] = [];
  const data = getArray(getPath(response, ['data']));

  for (const accommodation of data) {
    const candidates = [
      ...getArray(getPath(accommodation, ['products'])),
      ...getArray(getPath(accommodation, ['recommendation', 'products'])),
    ];

    for (const product of candidates) {
      const id = getString(getPath(product, ['id']));
      if (!id) {
        continue;
      }
      products.push({
        id,
        label:
          getString(getPath(product, ['room', 'name'])) ??
          getString(getPath(product, ['name'])) ??
          getString(getPath(product, ['room'])) ??
          'Available room',
        allocation: getPath(product, ['allocation']),
        currencyCode: getCurrencyCode(product),
        priceTotal: getPriceTotal(product),
        roomId: getString(getPath(product, ['room'])),
        policies: getPath(product, ['policies']),
      });
    }
  }

  return products;
}

export function normalizePreviewResponse(response: unknown): BookingComPreview {
  const data = getPath(response, ['data']) ?? response;
  const orderToken = getString(getPath(data, ['order_token'])) ?? getString(getPath(data, ['token']));
  if (!orderToken) {
    throw new Error('Booking.com did not return an order token.');
  }

  const accommodation = getPath(data, ['accommodation']) ?? data;
  const products = normalizeAvailabilityResponse({ data: [accommodation] });
  const payment = getPath(accommodation, ['general_policies', 'payment']) ?? getPath(data, ['payment']);
  const paymentOptions = getArray(getPath(payment, ['methods'])).flatMap((method) => {
    const methodName = getString(getPath(method, ['method'])) ?? getString(getPath(method, ['name'])) ?? getString(method);
    const timings = getArray(getPath(method, ['timings'])).map(getString).filter((value): value is string => Boolean(value));
    if (!methodName) {
      return [];
    }
    return (timings.length ? timings : ['pay_online_now']).map((timing) => ({ method: methodName, timing }));
  });

  return {
    orderToken,
    currencyCode: getCurrencyCode(accommodation),
    totalPrice: getPriceTotal(accommodation),
    paymentOptions,
    products,
    policies: products[0]?.policies ?? getPath(accommodation, ['policies']),
  };
}

export function normalizeCreateOrderResponse(response: unknown): BookingComCreateResult {
  const data = getPath(response, ['data']) ?? response;
  const accommodation = getPath(data, ['accommodation']) ?? data;
  const orderId = getString(getPath(response, ['order'])) ?? getString(getPath(accommodation, ['order']));
  if (!orderId) {
    throw new Error('Booking.com did not return an order id.');
  }

  return {
    orderId,
    reservationId: getString(getPath(accommodation, ['reservation'])),
    pincode: getString(getPath(accommodation, ['pincode'])),
    receiptUrl: getString(getPath(data, ['payment', 'receipt_url'])),
    status: 'booked',
    sanitizedSnapshot: sanitizeForStorage(response),
  };
}

const SENSITIVE_KEYS = new Set([
  'card',
  'cardholder',
  'card_number',
  'cvc',
  'cvv',
  'expiry',
  'expiry_date',
  'number',
  'security_code',
]);

export function sanitizeForStorage(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeForStorage);
  }

  if (!isRecord(value)) {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[redacted]';
      continue;
    }
    sanitized[key] = sanitizeForStorage(nestedValue);
  }

  return sanitized;
}
