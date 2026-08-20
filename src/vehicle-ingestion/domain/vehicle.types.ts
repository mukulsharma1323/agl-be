export interface VehicleType {
  typeId: number;
  typeName: string;
}

export interface VehicleMake {
  makeId: number;
  makeName: string;
  vehicleTypes: VehicleType[];
}

export interface RawVehicleMake {
  Make_ID?: string | number;
  Make_Name?: string;
}

export interface RawVehicleType {
  VehicleTypeId?: string | number;
  VehicleTypeName?: string;
}

export interface IngestionResult {
  requestedMakes: number;
  savedMakes: number;
  failedMakes: number;
}
