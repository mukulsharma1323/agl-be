import { RawVehicleMake, RawVehicleType, VehicleMake } from './vehicle.types';
import { asArray, requiredNumber, requiredString } from './xml-normalizer';

interface AllMakesXml {
  Response?: {
    Results?: {
      AllVehicleMakes?: RawVehicleMake | RawVehicleMake[];
    };
  };
}

interface VehicleTypesXml {
  Response?: {
    Results?: {
      VehicleTypesForMakeIds?: RawVehicleType | RawVehicleType[];
    };
  };
}

export function extractMakes(document: AllMakesXml): RawVehicleMake[] {
  return asArray(document.Response?.Results?.AllVehicleMakes);
}

export function extractVehicleTypes(
  document: VehicleTypesXml,
): RawVehicleType[] {
  return asArray(document.Response?.Results?.VehicleTypesForMakeIds);
}

export function transformVehicleMake(
  rawMake: RawVehicleMake,
  rawVehicleTypes: RawVehicleType[],
): VehicleMake {
  const makeId = requiredNumber(rawMake.Make_ID, 'Make_ID');
  const makeName = requiredString(rawMake.Make_Name, 'Make_Name');

  const vehicleTypes = rawVehicleTypes
    .map((rawType) => ({
      typeId: requiredNumber(rawType.VehicleTypeId, 'VehicleTypeId'),
      typeName: requiredString(rawType.VehicleTypeName, 'VehicleTypeName'),
    }))
    .sort((left, right) => left.typeId - right.typeId);

  return {
    makeId,
    makeName,
    vehicleTypes,
  };
}
