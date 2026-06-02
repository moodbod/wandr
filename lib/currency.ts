import currency from 'currency.js';

const LIVE_RATE_SOURCE = 'fxapi.app';
const USD_FALLBACK_RATE_LABEL = 'Showing USD until live rate loads';

export const supportedCurrencies = [
  { code: 'USD', label: 'US dollar' },
  { code: 'NAD', label: 'Namibian dollar' },
  { code: 'ZAR', label: 'South African rand' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British pound' },
] as const;

export type SupportedCurrencyCode = (typeof supportedCurrencies)[number]['code'];
export type UsdExchangeRates = Partial<Record<SupportedCurrencyCode, number>>;

let liveUsdRates: UsdExchangeRates | null = null;
let liveUsdRatesSource = LIVE_RATE_SOURCE;

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
  const selectedCurrency = getCurrency(currencyCode);
  return convertUsdToCurrency(amountUsd, selectedCurrency.code);
}

function getCurrency(currencyCode: string) {
  const normalizedCode = isSupportedCurrencyCode(currencyCode) ? currencyCode : 'USD';
  return supportedCurrencies.find((candidate) => candidate.code === normalizedCode) ?? supportedCurrencies[0];
}

function getRateFromUsd(currencyCode: string) {
  const selectedCurrency = getCurrency(currencyCode);
  if (selectedCurrency.code === 'USD') {
    return 1;
  }

  const liveRate = liveUsdRates?.[selectedCurrency.code];
  return Number.isFinite(liveRate) && typeof liveRate === 'number' ? liveRate : null;
}

export function setLiveUsdRates(rates: UsdExchangeRates, source = LIVE_RATE_SOURCE) {
  liveUsdRates = {
    USD: 1,
    ...rates,
  };
  liveUsdRatesSource = source;
}

export function clearLiveUsdRates() {
  liveUsdRates = null;
  liveUsdRatesSource = LIVE_RATE_SOURCE;
}

function formatCurrencyAmount(amount: number, currencyCode: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: amount >= 100 ? 0 : 2,
  }).format(amount);
}

export function convertUsdToCurrency(amountUsd: number, currencyCode = 'USD') {
  const selectedCurrency = getCurrency(currencyCode);
  const rate = getRateFromUsd(selectedCurrency.code);
  return rate === null ? null : currency(amountUsd).multiply(rate).value;
}

export function formatUsdAsCurrency(amountUsd: number, currencyCode = 'USD') {
  const selectedCurrency = getCurrency(currencyCode);
  const convertedAmount = convertUsdToCurrency(amountUsd, selectedCurrency.code);
  return convertedAmount === null
    ? formatCurrencyAmount(amountUsd, 'USD')
    : formatCurrencyAmount(convertedAmount, selectedCurrency.code);
}

export function formatUsdRate(currencyCode = 'USD') {
  const selectedCurrency = getCurrency(currencyCode);
  const rate = getRateFromUsd(selectedCurrency.code);
  if (selectedCurrency.code === 'USD') {
    return 'USD';
  }

  return rate === null
    ? USD_FALLBACK_RATE_LABEL
    : `1 USD = ${formatCurrencyAmount(rate, selectedCurrency.code)} ${selectedCurrency.code}`;
}

export function formatUsdConversion(amountUsd: number, currencyCode = 'USD') {
  return `${formatUsdAsCurrency(amountUsd, currencyCode)} · ${formatUsdRate(currencyCode)}`;
}

export function formatUsdConversionParts(amountUsd: number, currencyCode = 'USD') {
  return {
    amountLabel: formatUsdAsCurrency(amountUsd, currencyCode),
    rateLabel: formatUsdRate(currencyCode),
  };
}

export function parseUsdAmount(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/,/g, '').match(/\d+(\.\d+)?/);
  return normalized ? Number.parseFloat(normalized[0]) : null;
}

export function formatUsdPrice(value: number | string | null | undefined, currencyCode = 'USD') {
  return formatUsdPriceParts(value, currencyCode).amountLabel;
}

export function formatUsdPriceParts(value: number | string | null | undefined, currencyCode = 'USD') {
  const amountUsd = parseUsdAmount(value);

  if (amountUsd === null) {
    return {
      amountLabel: typeof value === 'string' ? value.trim() : '',
      rateLabel: '',
    };
  }

  if (amountUsd <= 0) {
    return {
      amountLabel: 'Free',
      rateLabel: '',
    };
  }

  return formatUsdConversionParts(amountUsd, currencyCode);
}
