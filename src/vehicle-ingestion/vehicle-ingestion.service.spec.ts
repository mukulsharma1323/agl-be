import { InternalServerErrorException } from '@nestjs/common';
import { VehicleIngestionService } from './vehicle-ingestion.service';
import type { ConfigService } from '@nestjs/config';
import type { AppLogger } from '../logging/logger.types';
import type { NhtsaClient } from './infrastructure/nhtsa.client';
import type { VehicleRepository } from './infrastructure/vehicle.repository';

const logger = {
  info: jest.fn(),
  error: jest.fn(),
};

const config = {
  getOrThrow: jest.fn((key: string) => {
    const values: Record<string, unknown> = {
      'ingestion.ingestOnStartup': false,
      'ingestion.maxMakes': 0,
      'ingestion.concurrency': 2,
    };

    return values[key];
  }),
};

describe('VehicleIngestionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches XML, transforms records, and persists successful makes', async () => {
    const client = {
      fetchAllMakesXml: jest.fn().mockResolvedValue({
        Response: {
          Results: {
            AllVehicleMakes: [
              { Make_ID: '440', Make_Name: 'ASTON MARTIN' },
              { Make_ID: '441', Make_Name: 'TESLA' },
            ],
          },
        },
      }),
      fetchVehicleTypesXml: jest.fn().mockResolvedValue({
        Response: {
          Results: {
            VehicleTypesForMakeIds: [
              { VehicleTypeId: '2', VehicleTypeName: 'Passenger Car' },
            ],
          },
        },
      }),
    };
    const repository = { upsertMany: jest.fn() };
    const service = new VehicleIngestionService(
      client as unknown as NhtsaClient,
      repository as unknown as VehicleRepository,
      config as unknown as ConfigService,
      logger as unknown as AppLogger,
    );

    await expect(service.ingest()).resolves.toEqual({
      requestedMakes: 2,
      savedMakes: 2,
      failedMakes: 0,
    });
    expect(repository.upsertMany).toHaveBeenCalledWith([
      {
        makeId: 440,
        makeName: 'ASTON MARTIN',
        vehicleTypes: [{ typeId: 2, typeName: 'Passenger Car' }],
      },
      {
        makeId: 441,
        makeName: 'TESLA',
        vehicleTypes: [{ typeId: 2, typeName: 'Passenger Car' }],
      },
    ]);
  });

  it('wraps unrecoverable ingestion failures', async () => {
    const service = new VehicleIngestionService(
      {
        fetchAllMakesXml: jest.fn().mockRejectedValue(new Error('network')),
      } as unknown as NhtsaClient,
      { upsertMany: jest.fn() } as unknown as VehicleRepository,
      config as unknown as ConfigService,
      logger as unknown as AppLogger,
    );

    await expect(service.ingest()).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
