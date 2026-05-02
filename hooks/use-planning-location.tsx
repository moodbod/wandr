import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  defaultPlanningLocation,
  getPlanningLocationForCoordinate,
  type PlanningLocation,
} from '@/constants/planning-countries';

type PlanningLocationContextValue = {
  hasManualSelection: boolean;
  planningLocation: PlanningLocation;
  setPlanningLocation: (location: PlanningLocation, options?: { manual?: boolean }) => void;
};

const PlanningLocationContext = createContext<PlanningLocationContextValue | null>(null);

export function PlanningLocationProvider({ children }: { children: React.ReactNode }) {
  const [planningLocation, setPlanningLocationState] = useState<PlanningLocation>(defaultPlanningLocation);
  const [hasManualSelection, setHasManualSelection] = useState(false);

  const value = useMemo<PlanningLocationContextValue>(
    () => ({
      hasManualSelection,
      planningLocation,
      setPlanningLocation: (location, options) => {
        if (options?.manual) {
          setHasManualSelection(true);
        } else if (options?.manual === false) {
          setHasManualSelection(false);
        }
        setPlanningLocationState(location);
      },
    }),
    [hasManualSelection, planningLocation]
  );

  return (
    <PlanningLocationContext.Provider value={value}>
      {children}
    </PlanningLocationContext.Provider>
  );
}

export function usePlanningLocation() {
  const context = useContext(PlanningLocationContext);

  if (!context) {
    throw new Error('usePlanningLocation must be used within PlanningLocationProvider');
  }

  return context;
}

export function useSyncPlanningLocationWithCurrentLocation(coordinate?: readonly [number, number] | null) {
  const { hasManualSelection, planningLocation, setPlanningLocation } = usePlanningLocation();

  useEffect(() => {
    const currentPlanningLocation = getPlanningLocationForCoordinate(coordinate);
    if (!currentPlanningLocation) {
      return;
    }

    if (hasManualSelection) {
      if (currentPlanningLocation.id === planningLocation.id) {
        setPlanningLocation(currentPlanningLocation, { manual: false });
      }
      return;
    }

    if (currentPlanningLocation.id !== planningLocation.id) {
      setPlanningLocation(currentPlanningLocation);
    }
  }, [coordinate, hasManualSelection, planningLocation.id, setPlanningLocation]);
}
