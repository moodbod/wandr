import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { PlanningLocationSheet } from '@/components/wandr/planning-country-sheet';
import {
  defaultPlanningLocation,
  getPlanningLocationForCoordinate,
  type PlanningLocation,
} from '@/constants/planning-countries';

type OpenPlanningLocationSheetOptions = {
  currentCoordinate?: readonly [number, number] | null;
  onSelectLocation?: (location: PlanningLocation) => void;
};

type PlanningLocationContextValue = {
  hasManualSelection: boolean;
  openPlanningLocationSheet: (options?: OpenPlanningLocationSheetOptions) => void;
  planningLocation: PlanningLocation;
  setPlanningLocation: (location: PlanningLocation, options?: { manual?: boolean }) => void;
};

const PlanningLocationContext = createContext<PlanningLocationContextValue | null>(null);

export function PlanningLocationProvider({ children }: { children: React.ReactNode }) {
  const [planningLocation, setPlanningLocationState] = useState<PlanningLocation>(defaultPlanningLocation);
  const [hasManualSelection, setHasManualSelection] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerCoordinate, setPickerCoordinate] = useState<readonly [number, number] | null | undefined>(undefined);
  const [pickerSelectCallback, setPickerSelectCallback] = useState<((location: PlanningLocation) => void) | null>(null);

  const setPlanningLocation = useCallback((location: PlanningLocation, options?: { manual?: boolean }) => {
    if (options?.manual) {
      setHasManualSelection(true);
    } else if (options?.manual === false) {
      setHasManualSelection(false);
    }
    setPlanningLocationState(location);
  }, []);

  const openPlanningLocationSheet = useCallback((options?: OpenPlanningLocationSheetOptions) => {
    setPickerCoordinate(options?.currentCoordinate);
    setPickerSelectCallback(() => options?.onSelectLocation ?? null);
    setPickerVisible(true);
  }, []);

  const handleClosePicker = useCallback(() => {
    setPickerVisible(false);
  }, []);

  const handleSelectPickerLocation = useCallback(
    (location: PlanningLocation) => {
      setPlanningLocation(location, { manual: true });
      pickerSelectCallback?.(location);
    },
    [pickerSelectCallback, setPlanningLocation]
  );

  const value = useMemo<PlanningLocationContextValue>(
    () => ({
      hasManualSelection,
      openPlanningLocationSheet,
      planningLocation,
      setPlanningLocation,
    }),
    [hasManualSelection, openPlanningLocationSheet, planningLocation, setPlanningLocation]
  );

  return (
    <PlanningLocationContext.Provider value={value}>
      {children}
      <PlanningLocationSheet
        currentCoordinate={pickerCoordinate}
        selectedLocation={planningLocation}
        visible={pickerVisible}
        onClose={handleClosePicker}
        onSelectLocation={handleSelectPickerLocation}
      />
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
