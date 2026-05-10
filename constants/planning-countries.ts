type LocationBounds = {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
};

export type PlanningLocation = {
  id: string;
  label: string;
  detail: string;
  countryCode?: string;
  countryLabel?: string;
  centerCoordinate?: readonly [number, number];
  bounds?: LocationBounds;
  radiusKm?: number;
  isSupported?: boolean;
  isSearchPrompt?: boolean;
  searchAliases: readonly string[];
};

export const defaultPlanningLocations: readonly PlanningLocation[] = [
  {
    id: 'namibia',
    label: 'Namibia',
    detail: 'Supported travel region',
    countryCode: 'NA',
    countryLabel: 'Namibia',
    bounds: {
      minLng: 11.7,
      maxLng: 25.3,
      minLat: -29.2,
      maxLat: -16.8,
    },
    searchAliases: [
      'namibia',
      'windhoek',
      'khomas',
      'erongo',
      'swakopmund',
      'walvis bay',
      'etosha',
      'sossusvlei',
      'hardap',
      'kunene',
      'oshikoto',
    ],
    isSupported: true,
  },
  {
    id: 'south-africa',
    label: 'South Africa',
    detail: 'Supported travel region',
    countryCode: 'ZA',
    countryLabel: 'South Africa',
    bounds: {
      minLng: 17.6,
      maxLng: 20.2,
      minLat: -34.9,
      maxLat: -32.6,
    },
    searchAliases: [
      'south africa',
      'za',
      'cape town',
      'western cape',
      'table mountain',
      'waterfront',
      'kirstenbosch',
      'stellenbosch',
      'franschhoek',
      'garden route',
      'kruger',
    ],
    isSupported: true,
  },
];

export const defaultPlanningLocation = defaultPlanningLocations[0];

export const otherCountriesPlanningLocationOption: PlanningLocation = {
  id: 'other-countries',
  label: 'Other countries',
  detail: 'Search any city, country, or region',
  isSearchPrompt: true,
  searchAliases: ['other countries', 'elsewhere', 'another country', 'international'],
};

export const defaultPlanningLocationPickerOptions: readonly PlanningLocation[] = [
  defaultPlanningLocation,
  otherCountriesPlanningLocationOption,
];

const isoCountries = [
  { code: 'AD', name: 'Andorra' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AG', name: 'Antigua & Barbuda' },
  { code: 'AI', name: 'Anguilla' },
  { code: 'AL', name: 'Albania' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AO', name: 'Angola' },
  { code: 'AQ', name: 'Antarctica' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AS', name: 'American Samoa' },
  { code: 'AT', name: 'Austria' },
  { code: 'AU', name: 'Australia' },
  { code: 'AW', name: 'Aruba' },
  { code: 'AX', name: 'Åland Islands' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BA', name: 'Bosnia & Herzegovina' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BI', name: 'Burundi' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BL', name: 'St. Barthélemy' },
  { code: 'BM', name: 'Bermuda' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BQ', name: 'Caribbean Netherlands' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BV', name: 'Bouvet Island' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BZ', name: 'Belize' },
  { code: 'CA', name: 'Canada' },
  { code: 'CC', name: 'Cocos (Keeling) Islands' },
  { code: 'CD', name: 'Congo - Kinshasa' },
  { code: 'CF', name: 'Central African Republic' },
  { code: 'CG', name: 'Congo - Brazzaville' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'CI', name: 'Côte d’Ivoire' },
  { code: 'CK', name: 'Cook Islands' },
  { code: 'CL', name: 'Chile' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CV', name: 'Cape Verde' },
  { code: 'CW', name: 'Curaçao' },
  { code: 'CX', name: 'Christmas Island' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czechia' },
  { code: 'DE', name: 'Germany' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EE', name: 'Estonia' },
  { code: 'EG', name: 'Egypt' },
  { code: 'EH', name: 'Western Sahara' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'ES', name: 'Spain' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FK', name: 'Falkland Islands' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'FO', name: 'Faroe Islands' },
  { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GE', name: 'Georgia' },
  { code: 'GF', name: 'French Guiana' },
  { code: 'GG', name: 'Guernsey' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GI', name: 'Gibraltar' },
  { code: 'GL', name: 'Greenland' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GP', name: 'Guadeloupe' },
  { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'GR', name: 'Greece' },
  { code: 'GS', name: 'South Georgia & South Sandwich Islands' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GU', name: 'Guam' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HK', name: 'Hong Kong SAR China' },
  { code: 'HM', name: 'Heard & McDonald Islands' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HR', name: 'Croatia' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HU', name: 'Hungary' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IM', name: 'Isle of Man' },
  { code: 'IN', name: 'India' },
  { code: 'IO', name: 'British Indian Ocean Territory' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IR', name: 'Iran' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IT', name: 'Italy' },
  { code: 'JE', name: 'Jersey' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JO', name: 'Jordan' },
  { code: 'JP', name: 'Japan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KM', name: 'Comoros' },
  { code: 'KN', name: 'St. Kitts & Nevis' },
  { code: 'KP', name: 'North Korea' },
  { code: 'KR', name: 'South Korea' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KY', name: 'Cayman Islands' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'LA', name: 'Laos' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LC', name: 'St. Lucia' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LY', name: 'Libya' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MD', name: 'Moldova' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MF', name: 'St. Martin' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MH', name: 'Marshall Islands' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'ML', name: 'Mali' },
  { code: 'MM', name: 'Myanmar (Burma)' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'MO', name: 'Macao SAR China' },
  { code: 'MP', name: 'Northern Mariana Islands' },
  { code: 'MQ', name: 'Martinique' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MS', name: 'Montserrat' },
  { code: 'MT', name: 'Malta' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'MV', name: 'Maldives' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MX', name: 'Mexico' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NC', name: 'New Caledonia' },
  { code: 'NE', name: 'Niger' },
  { code: 'NF', name: 'Norfolk Island' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NO', name: 'Norway' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NU', name: 'Niue' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'OM', name: 'Oman' },
  { code: 'PA', name: 'Panama' },
  { code: 'PE', name: 'Peru' },
  { code: 'PF', name: 'French Polynesia' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PL', name: 'Poland' },
  { code: 'PM', name: 'St. Pierre & Miquelon' },
  { code: 'PN', name: 'Pitcairn Islands' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'PS', name: 'Palestinian Territories' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PW', name: 'Palau' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RE', name: 'Réunion' },
  { code: 'RO', name: 'Romania' },
  { code: 'RS', name: 'Serbia' },
  { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SE', name: 'Sweden' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SH', name: 'St. Helena' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SJ', name: 'Svalbard & Jan Mayen' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SM', name: 'San Marino' },
  { code: 'SN', name: 'Senegal' },
  { code: 'SO', name: 'Somalia' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'ST', name: 'São Tomé & Príncipe' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'SX', name: 'Sint Maarten' },
  { code: 'SY', name: 'Syria' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'TC', name: 'Turks & Caicos Islands' },
  { code: 'TD', name: 'Chad' },
  { code: 'TF', name: 'French Southern Territories' },
  { code: 'TG', name: 'Togo' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TK', name: 'Tokelau' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TR', name: 'Türkiye' },
  { code: 'TT', name: 'Trinidad & Tobago' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UM', name: 'U.S. Outlying Islands' },
  { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VA', name: 'Vatican City' },
  { code: 'VC', name: 'St. Vincent & Grenadines' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VG', name: 'British Virgin Islands' },
  { code: 'VI', name: 'U.S. Virgin Islands' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'WF', name: 'Wallis & Futuna' },
  { code: 'WS', name: 'Samoa' },
  { code: 'YE', name: 'Yemen' },
  { code: 'YT', name: 'Mayotte' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
] as const;

export const allPlanningCountryOptions: readonly PlanningLocation[] = isoCountries
  .map(({ code: countryCode, name: label }) => {
    const supportedLocation = defaultPlanningLocations.find((location) => location.countryCode === countryCode);
    if (supportedLocation) {
      return supportedLocation;
    }

    return {
      id: `country-${countryCode.toLowerCase()}`,
      label,
      detail: 'No planning data yet',
      countryCode,
      countryLabel: label,
      isSupported: false,
      searchAliases: [label.toLowerCase(), countryCode.toLowerCase()],
    };
  })
  .sort((a, b) => a.label.localeCompare(b.label));

export function createPlanningLocationFromInput(input: string): PlanningLocation | null {
  const label = input.trim().replace(/\s+/g, ' ');
  if (!label) {
    return null;
  }

  return {
    id: `custom-${label.toLowerCase()}`,
    label,
    detail: 'Custom planning location',
    searchAliases: [label.toLowerCase()],
  };
}

export function getPlanningLocationForCoordinate(
  coordinate?: readonly [number, number] | null
): PlanningLocation | null {
  if (!coordinate) {
    return null;
  }

  return defaultPlanningLocations.find((location) => coordinateIsInPlanningLocation(coordinate, location)) ?? null;
}

type PlanningLocationSource = {
  coordinate?: readonly number[] | null;
  countryCode?: string | null;
  countryLabel?: string | null;
  planningLocationId?: string | null;
};

export function buildPlanningLocationsFromDestinations(
  destinations: readonly PlanningLocationSource[]
): readonly PlanningLocation[] {
  const buckets = new Map<
    string,
    {
      base: PlanningLocation;
      count: number;
      latitudeTotal: number;
      longitudeTotal: number;
    }
  >();

  destinations.forEach((destination) => {
    const coordinate = normalizePlanningLocationCoordinate(destination.coordinate);
    if (!coordinate) {
      return;
    }

    const baseLocation =
      getPlanningLocationForCountry(destination) ??
      getPlanningLocationForCoordinate(coordinate);

    if (!baseLocation?.countryCode) {
      return;
    }

    const key = baseLocation.countryCode.toUpperCase();
    const existing = buckets.get(key);

    if (existing) {
      existing.count += 1;
      existing.longitudeTotal += coordinate[0];
      existing.latitudeTotal += coordinate[1];
      return;
    }

    buckets.set(key, {
      base: baseLocation,
      count: 1,
      longitudeTotal: coordinate[0],
      latitudeTotal: coordinate[1],
    });
  });

  return [...buckets.values()]
    .map(({ base, count, latitudeTotal, longitudeTotal }) => ({
      ...base,
      centerCoordinate: [longitudeTotal / count, latitudeTotal / count] as const,
      detail: count === 1 ? '1 place available' : `${count} places available`,
      isSupported: true,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getPlanningLocationCenterCoordinate(
  location?: PlanningLocation | null
): readonly [number, number] | null {
  if (!location) {
    return null;
  }

  if (location.centerCoordinate) {
    return location.centerCoordinate;
  }

  if (!location.bounds) {
    return null;
  }

  return [
    (location.bounds.minLng + location.bounds.maxLng) / 2,
    (location.bounds.minLat + location.bounds.maxLat) / 2,
  ];
}

export function coordinateIsInPlanningLocation(
  coordinate: readonly [number, number] | null | undefined,
  location: PlanningLocation
) {
  if (!coordinate) {
    return false;
  }

  const [lng, lat] = coordinate;
  const { bounds, centerCoordinate, radiusKm } = location;

  if (!bounds && centerCoordinate && radiusKm) {
    return getDistanceInKm(coordinate, centerCoordinate) <= radiusKm;
  }

  if (!bounds) {
    return false;
  }

  return lng >= bounds.minLng && lng <= bounds.maxLng && lat >= bounds.minLat && lat <= bounds.maxLat;
}

export function labelsMatchPlanningLocation(
  labels: readonly (string | null | undefined)[],
  location: PlanningLocation
) {
  const text = labels.filter(Boolean).join(' ').toLowerCase();
  if (!text) {
    return false;
  }

  return location.searchAliases.some((alias) => text.includes(alias));
}

export function getPlanningLocationForCountry({
  countryCode,
  countryLabel,
  planningLocationId,
}: {
  countryCode?: string | null;
  countryLabel?: string | null;
  planningLocationId?: string | null;
}) {
  const normalizedCountryCode = countryCode?.trim().toUpperCase();
  const normalizedCountryLabel = countryLabel?.trim().toLowerCase();

  const matcher = (location: PlanningLocation) => {
    if (planningLocationId && location.id === planningLocationId) {
      return true;
    }

    if (normalizedCountryCode && location.countryCode === normalizedCountryCode) {
      return true;
    }

    return Boolean(
      normalizedCountryLabel &&
        (location.countryLabel?.toLowerCase() === normalizedCountryLabel ||
          location.label.toLowerCase() === normalizedCountryLabel)
    );
  };

  return (
    defaultPlanningLocations.find(matcher) ??
    allPlanningCountryOptions.find(matcher) ??
    null
  );
}

export function getPlanningLocationMetadataForDestination({
  coordinate,
  labels = [],
  region,
  town,
}: {
  coordinate?: readonly number[] | null;
  labels?: readonly (string | null | undefined)[];
  region?: string | null;
  town?: string | null;
}) {
  const resolvedCoordinate =
    coordinate && coordinate.length >= 2
      ? ([coordinate[0], coordinate[1]] as const)
      : null;
  const location =
    getPlanningLocationForCoordinate(resolvedCoordinate) ??
    defaultPlanningLocations.find((candidate) =>
      labelsMatchPlanningLocation([region, town, ...labels], candidate)
    ) ??
    null;

  return location
    ? {
        countryCode: location.countryCode,
        countryLabel: location.countryLabel ?? location.label,
        planningLocationId: location.id,
      }
    : {};
}

export function destinationMatchesPlanningLocation({
  coordinate,
  countryCode,
  countryLabel,
  location,
  labels = [],
  planningLocationId,
}: {
  coordinate?: readonly [number, number] | null;
  countryCode?: string | null;
  countryLabel?: string | null;
  location: PlanningLocation;
  labels?: readonly (string | null | undefined)[];
  planningLocationId?: string | null;
}) {
  const locationFromCountry = getPlanningLocationForCountry({
    countryCode,
    countryLabel,
    planningLocationId,
  });

  if (locationFromCountry) {
    return locationFromCountry.id === location.id;
  }

  return coordinateIsInPlanningLocation(coordinate, location) || labelsMatchPlanningLocation(labels, location);
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

function normalizePlanningLocationCoordinate(
  coordinate?: readonly number[] | null
): readonly [number, number] | null {
  if (!coordinate || coordinate.length < 2) {
    return null;
  }

  const longitude = Number(coordinate[0]);
  const latitude = Number(coordinate[1]);

  return Number.isFinite(longitude) && Number.isFinite(latitude)
    ? ([longitude, latitude] as const)
    : null;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
