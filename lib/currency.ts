export const supportedCurrencies = [
  { code: 'USD', label: 'US dollar', rateFromUsd: 1 },
  { code: 'NAD', label: 'Namibian dollar', rateFromUsd: 18.6 },
  { code: 'ZAR', label: 'South African rand', rateFromUsd: 18.6 },
  { code: 'EUR', label: 'Euro', rateFromUsd: 0.92 },
  { code: 'GBP', label: 'British pound', rateFromUsd: 0.78 },
] as const;

export type SupportedCurrencyCode = (typeof supportedCurrencies)[number]['code'];

const countryCurrencyMap: Record<string, SupportedCurrencyCode> = {
  NA: 'NAD',
  ZA: 'ZAR',
  US: 'USD',
  GB: 'GBP',
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  IE: 'EUR',
};

export function isSupportedCurrencyCode(value: string): value is SupportedCurrencyCode {
  return supportedCurrencies.some((currency) => currency.code === value);
}

export function getDefaultCurrencyForCountry(countryCode?: string | null): SupportedCurrencyCode {
  const normalizedCode = countryCode?.trim().toUpperCase();
  return normalizedCode ? countryCurrencyMap[normalizedCode] ?? 'USD' : 'USD';
}

export function orderCurrenciesForCountry(countryCode?: string | null) {
  const defaultCurrency = getDefaultCurrencyForCountry(countryCode);
  return [
    ...supportedCurrencies.filter((currency) => currency.code === defaultCurrency),
    ...supportedCurrencies.filter((currency) => currency.code !== defaultCurrency),
  ];
}

export function convertUsd(amountUsd: number, currencyCode: string) {
  const currency = supportedCurrencies.find((candidate) => candidate.code === currencyCode) ?? supportedCurrencies[0];
  return amountUsd * currency.rateFromUsd;
}

export function formatUsdAsCurrency(amountUsd: number, currencyCode = 'USD') {
  const normalizedCode = isSupportedCurrencyCode(currencyCode) ? currencyCode : 'USD';
  const convertedAmount = convertUsd(amountUsd, normalizedCode);

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: normalizedCode,
    maximumFractionDigits: convertedAmount >= 100 ? 0 : 2,
  }).format(convertedAmount);
}
