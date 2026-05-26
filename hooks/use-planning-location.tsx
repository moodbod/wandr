import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { PlanningLocationSheet } from '@/components/wandr/planning-country-sheet';
import {
  defaultPlanningLocation,
  getDataBackedPlanningLocation,
  getPlanningLocationForCoordinate,
  type PlanningLocation,
} from '@/constants/planning-countries';

type OpenPlanningLocationSheetOptions = {
  availableLocations?: readonly PlanningLocation[];
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
  const [pickerAvailableLocations, setPickerAvailableLocations] = useState<readonly PlanningLocation[] | undefined>(undefined);
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
    setPickerAvailableLocations(options?.availableLocations);
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
      {pickerVisible ? (
        <PlanningLocationSheet
          availableLocations={pickerAvailableLocations}
          currentCoordinate={pickerCoordinate}
          selectedLocation={planningLocation}
          visible={pickerVisible}
          onClose={handleClosePicker}
          onSelectLocation={handleSelectPickerLocation}
        />
      ) : null}
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

function locationsAreEquivalent(a: PlanningLocation, b: PlanningLocation) {
  const aCenter = a.centerCoordinate?.join(',');
  const bCenter = b.centerCoordinate?.join(',');

  return (
    a.id === b.id &&
    a.detail === b.detail &&
    a.isSupported === b.isSupported &&
    aCenter === bCenter
  );
}

export function useSyncPlanningLocationWithAvailableLocations(availableLocations?: readonly PlanningLocation[]) {
  const { planningLocation, setPlanningLocation } = usePlanningLocation();

  useEffect(() => {
    if (!availableLocations || availableLocations.length === 0) {
      return;
    }

    const dataBackedLocation = getDataBackedPlanningLocation(planningLocation, availableLocations);

    if (dataBackedLocation) {
      if (!locationsAreEquivalent(planningLocation, dataBackedLocation)) {
        setPlanningLocation(dataBackedLocation);
      }
      return;
    }

    setPlanningLocation(availableLocations[0], { manual: false });
  }, [availableLocations, planningLocation, setPlanningLocation]);
}

export function useSyncPlanningLocationWithCurrentLocation(
  coordinate?: readonly [number, number] | null,
  availableLocations?: readonly PlanningLocation[]
) {
  const { hasManualSelection, planningLocation, setPlanningLocation } = usePlanningLocation();

  useEffect(() => {
    const currentPlanningLocation = getPlanningLocationForCoordinate(coordinate);
    if (!currentPlanningLocation) {
      return;
    }
    const currentDataBackedLocation =
      availableLocations === undefined
        ? currentPlanningLocation
        : getDataBackedPlanningLocation(currentPlanningLocation, availableLocations);

    if (!currentDataBackedLocation) {
      return;
    }

    if (hasManualSelection) {
      if (currentDataBackedLocation.id === planningLocation.id) {
        setPlanningLocation(currentDataBackedLocation, { manual: false });
      }
      return;
    }

    if (currentDataBackedLocation.id !== planningLocation.id) {
      setPlanningLocation(currentDataBackedLocation);
    }
  }, [availableLocations, coordinate, hasManualSelection, planningLocation.id, setPlanningLocation]);
}
