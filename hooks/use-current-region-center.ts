import { useCurrentLocation } from '@/hooks/use-current-location';

export function useCurrentRegionCenter() {
  return useCurrentLocation();
}
