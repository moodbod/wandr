import { useEffect, useState } from 'react';

import { setLiveUsdRates, type SupportedCurrencyCode, type UsdExchangeRates } from '@/lib/currency';

const FX_API_URL = 'https://fxapi.app/api/USD.json';
const SUPPORTED_RATE_CODES: readonly SupportedCurrencyCode[] = ['USD', 'NAD', 'ZAR', 'EUR', 'GBP'];

type FxApiResponse = {
  base?: string;
  rates?: Record<string, number>;
  timestamp?: string;
};

let exchangeRatesPromise: Promise<void> | null = null;
let exchangeRatesLoadedAt = 0;
const listeners = new Set<() => void>();

function emitExchangeRateUpdate() {
  listeners.forEach((listener) => listener());
}

async function fetchLiveUsdRates() {
  const response = await fetch(FX_API_URL);

  if (!response.ok) {
    throw new Error(`Exchange rate request failed with ${response.status}`);
  }

  const payload = (await response.json()) as FxApiResponse;

  if (payload.base !== 'USD' || !payload.rates) {
    throw new Error('Exchange rate response was not usable.');
  }

  const rates = SUPPORTED_RATE_CODES.reduce<UsdExchangeRates>((nextRates, code) => {
    const rate = payload.rates?.[code];
    if (typeof rate === 'number' && Number.isFinite(rate)) {
      nextRates[code] = rate;
    }
    return nextRates;
  }, {});

  setLiveUsdRates(rates, 'fxapi.app');
  exchangeRatesLoadedAt = payload.timestamp ? Math.floor(new Date(payload.timestamp).getTime() / 1000) : Math.floor(Date.now() / 1000);
  emitExchangeRateUpdate();
}

function ensureLiveUsdRates() {
  if (!exchangeRatesPromise) {
    exchangeRatesPromise = fetchLiveUsdRates().catch((error) => {
      console.warn('Failed to load live exchange rates. Currency conversion is unavailable until rates load.', error);
      exchangeRatesPromise = null;
    });
  }

  return exchangeRatesPromise;
}

export function useLiveExchangeRates() {
  const [loadedAt, setLoadedAt] = useState(exchangeRatesLoadedAt);

  useEffect(() => {
    const listener = () => setLoadedAt(exchangeRatesLoadedAt);
    listeners.add(listener);
    void ensureLiveUsdRates();

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { loadedAt };
}
