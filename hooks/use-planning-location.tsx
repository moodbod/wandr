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
    const nextManualSelection = options?.manual;
    if (nextManualSelection !== undefined) {
      setHasManualSelection((current) => current === nextManualSelection ? current : nextManualSelection);
    }
    setPlanningLocationState((current) => locationsAreEquivalent(current, location) ? current : location);
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
      <PlanningLocationSheet
        availableLocations={pickerAvailableLocations}
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

function locationsAreEquivalent(a: PlanningLocation, b: PlanningLocation) {
  return (
    a.id === b.id &&
    a.label === b.label &&
    a.detail === b.detail &&
    a.countryCode === b.countryCode &&
    a.countryLabel === b.countryLabel &&
    a.isSupported === b.isSupported &&
    a.isSearchPrompt === b.isSearchPrompt &&
    coordinateKey(a.centerCoordinate) === coordinateKey(b.centerCoordinate) &&
    boundsKey(a.bounds) === boundsKey(b.bounds) &&
    a.radiusKm === b.radiusKm &&
    a.searchAliases.join('|') === b.searchAliases.join('|')
  );
}

function coordinateKey(coordinate?: readonly [number, number]) {
  return coordinate?.join(',') ?? '';
}

function boundsKey(bounds?: PlanningLocation['bounds']) {
  return bounds
    ? `${bounds.minLng},${bounds.maxLng},${bounds.minLat},${bounds.maxLat}`
    : '';
}

export function useSyncPlanningLocationWithAvailableLocations(availableLocations?: readonly PlanningLocation[]) {
  const { planningLocation, setPlanningLocation } = usePlanningLocation();

  useEffect(() => {
    if (!availableLocations || availableLocations.length === 0) {
      return;
    }

    const dataBackedLocation = getDataBackedPlanningLocation(planningLocation, availableLocations);

    // Compare by stable `id`, never deep equality: `availableLocations` is rebuilt with
    // fresh objects every render, and two builds of the same place can differ in derived
    // fields (alias order, bounds, coordinate precision). A deep check would then report
    // "changed" every render and loop forever ("Maximum update depth exceeded").
    if (dataBackedLocation) {
      if (dataBackedLocation.id !== planningLocation.id) {
        setPlanningLocation(dataBackedLocation);
      }
      return;
    }

    if (availableLocations[0].id !== planningLocation.id) {
      setPlanningLocation(availableLocations[0], { manual: false });
    }
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
