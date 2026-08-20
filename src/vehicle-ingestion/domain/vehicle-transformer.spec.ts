import {
  extractMakes,
  extractVehicleTypes,
  transformVehicleMake,
} from './vehicle-transformer';

describe('vehicle transformer', () => {
  it('extracts arrays from NHTSA XML parser output', () => {
    expect(
      extractMakes({
        Response: {
          Results: {
            AllVehicleMakes: [
              { Make_ID: '440', Make_Name: 'ASTON MARTIN' },
              { Make_ID: '441', Make_Name: 'TESLA' },
            ],
          },
        },
      }),
    ).toHaveLength(2);

    expect(
      extractVehicleTypes({
        Response: {
          Results: {
            VehicleTypesForMakeIds: {
              VehicleTypeId: '2',
              VehicleTypeName: 'Passenger Car',
            },
          },
        },
      }),
    ).toEqual([{ VehicleTypeId: '2', VehicleTypeName: 'Passenger Car' }]);
  });

  it('combines make and vehicle type records into the required JSON shape', () => {
    expect(
      transformVehicleMake({ Make_ID: '440', Make_Name: 'ASTON MARTIN' }, [
        {
          VehicleTypeId: '7',
          VehicleTypeName: 'Multipurpose Passenger Vehicle',
        },
        { VehicleTypeId: '2', VehicleTypeName: 'Passenger Car' },
      ]),
    ).toEqual({
      makeId: 440,
      makeName: 'ASTON MARTIN',
      vehicleTypes: [
        { typeId: 2, typeName: 'Passenger Car' },
        { typeId: 7, typeName: 'Multipurpose Passenger Vehicle' },
      ],
    });
  });

  it('fails fast when required XML fields are missing', () => {
    expect(() =>
      transformVehicleMake({ Make_ID: 'not-a-number', Make_Name: '' }, []),
    ).toThrow('Invalid numeric field: Make_ID');
  });
});
