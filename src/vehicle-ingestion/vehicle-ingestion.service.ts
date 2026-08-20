import {
  Inject,
  Injectable,
  InternalServerErrorException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_LOGGER } from '../logging/logger.module';
import type { AppLogger } from '../logging/logger.types';
import {
  extractMakes,
  extractVehicleTypes,
  transformVehicleMake,
} from './domain/vehicle-transformer';
import { IngestionResult, RawVehicleMake } from './domain/vehicle.types';
import { NhtsaClient } from './infrastructure/nhtsa.client';
import { VehicleRepository } from './infrastructure/vehicle.repository';

@Injectable()
export class VehicleIngestionService implements OnApplicationBootstrap {
  constructor(
    private readonly client: NhtsaClient,
    private readonly vehicles: VehicleRepository,
    private readonly config: ConfigService,
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
  ) {}

  async onApplicationBootstrap() {
    this.logger.info('application startup complete');

    if (this.config.getOrThrow<boolean>('ingestion.ingestOnStartup')) {
      await this.ingest();
    }
  }

  async ingest(limit?: number): Promise<IngestionResult> {
    try {
      const allMakesXml = await this.client.fetchAllMakesXml();
      const configuredLimit =
        this.config.getOrThrow<number>('ingestion.maxMakes');
      const requestedLimit = limit ?? configuredLimit;
      const makes = extractMakes(allMakesXml).slice(
        0,
        requestedLimit > 0 ? requestedLimit : undefined,
      );
      const concurrency = this.config.getOrThrow<number>(
        'ingestion.concurrency',
      );

      const transformed = await this.mapConcurrent(
        makes,
        concurrency,
        async (make) => this.transformMakeWithTypes(make),
      );
      const successful = transformed.filter((make) => make !== null);

      await this.vehicles.upsertMany(successful);

      const result: IngestionResult = {
        requestedMakes: makes.length,
        savedMakes: successful.length,
        failedMakes: makes.length - successful.length,
      };

      this.logger.info(result, 'vehicle ingestion completed');
      return result;
    } catch (error) {
      this.logger.error({ err: error }, 'vehicle ingestion failed');
      throw new InternalServerErrorException('Vehicle ingestion failed');
    }
  }

  private async transformMakeWithTypes(make: RawVehicleMake) {
    try {
      const makeId = Number(make.Make_ID);
      const vehicleTypesXml = await this.client.fetchVehicleTypesXml(makeId);

      return transformVehicleMake(make, extractVehicleTypes(vehicleTypesXml));
    } catch (error) {
      this.logger.error(
        { err: error, makeId: make.Make_ID },
        'vehicle make transformation failed',
      );

      return null;
    }
  }

  private async mapConcurrent<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const results = new Array<R>(items.length);
    let cursor = 0;

    const workers = Array.from(
      { length: Math.min(concurrency, items.length) },
      async () => {
        while (cursor < items.length) {
          const index = cursor;
          cursor += 1;
          results[index] = await mapper(items[index]);
        }
      },
    );

    await Promise.all(workers);
    return results;
  }
}
