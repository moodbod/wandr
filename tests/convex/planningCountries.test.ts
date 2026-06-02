import { describe, expect, it } from 'vitest';

import {
  buildPlanningLocationsFromDestinations,
  coordinateIsInPlanningLocation,
  defaultPlanningLocation,
  defaultPlanningLocations,
  getDataBackedPlanningLocation,
  getPlanningLocationForCoordinate,
} from '../../constants/planning-countries';

describe('planning country availability', () => {
  it('builds an available country from destination metadata without coordinates', () => {
    const locations = buildPlanningLocationsFromDestinations([
      {
        countryCode: 'FR',
        countryLabel: 'France',
      },
    ]);

    expect(locations).toHaveLength(1);
    expect(locations[0]).toMatchObject({
      countryCode: 'FR',
      countryLabel: 'France',
      detail: '1 place available',
      isSupported: true,
      label: 'France',
    });
  });

  it('counts metadata-only destinations but averages only known coordinates', () => {
    const locations = buildPlanningLocationsFromDestinations([
      {
        countryCode: 'DE',
        countryLabel: 'Germany',
      },
      {
        coordinate: [10, 50],
        countryCode: 'DE',
        countryLabel: 'Germany',
      },
      {
        coordinate: [12, 52],
        countryCode: 'DE',
        countryLabel: 'Germany',
      },
    ]);

    expect(locations).toHaveLength(1);
    expect(locations[0]).toMatchObject({
      countryCode: 'DE',
      detail: '3 places available',
    });
    expect(locations[0].centerCoordinate).toEqual([11, 51]);
  });

  it('only treats countries as selectable when they are in the data-backed list', () => {
    const availableLocations = buildPlanningLocationsFromDestinations([
      {
        coordinate: [18.4, -33.9],
        countryCode: 'ZA',
        countryLabel: 'South Africa',
      },
    ]);

    expect(getDataBackedPlanningLocation(defaultPlanningLocation, availableLocations)).toBeNull();
    expect(
      getDataBackedPlanningLocation(
        {
          id: 'south-africa',
          label: 'South Africa',
          detail: 'Supported travel region',
          countryCode: 'ZA',
          countryLabel: 'South Africa',
          searchAliases: ['south africa'],
        },
        availableLocations
      )
    ).toMatchObject({
      countryCode: 'ZA',
      detail: '1 place available',
      isSupported: true,
    });
  });

  it('classifies South African trip coordinates beyond the Western Cape', () => {
    const southAfrica = defaultPlanningLocations.find((location) => location.id === 'south-africa');

    expect(southAfrica).toBeDefined();
    expect(getPlanningLocationForCoordinate([31.0218, -29.8587])?.id).toBe('south-africa');
    expect(getPlanningLocationForCoordinate([30.5271, -25.4658])?.id).toBe('south-africa');
    expect(coordinateIsInPlanningLocation([19.2407, -34.4092], southAfrica!)).toBe(true);
  });
});
