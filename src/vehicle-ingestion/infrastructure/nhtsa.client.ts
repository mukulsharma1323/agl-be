import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { Readable } from 'node:stream';
import sax from 'sax';
import { parseStringPromise } from 'xml2js';
import { APP_LOGGER } from '../../logging/logger.module';
import type { AppLogger } from '../../logging/logger.types';
import type { RawVehicleMake } from '../domain/vehicle.types';

@Injectable()
export class NhtsaClient {
  private readonly client: AxiosInstance;

  constructor(
    private readonly config: ConfigService,
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
  ) {
    this.client = axios.create({
      timeout: this.config.getOrThrow<number>('nhtsa.timeoutMs'),
      responseType: 'text',
    });
  }

  async fetchVehicleTypesXml(makeId: number): Promise<Record<string, unknown>> {
    const template = this.config.getOrThrow<string>(
      'nhtsa.vehicleTypesUrlTemplate',
    );

    return this.fetchXml(template.replace('{makeId}', String(makeId)));
  }

  async streamAllMakesInBatches(
    batchSize: number,
    onBatch: (batch: RawVehicleMake[]) => Promise<void>,
    limit = 0,
  ): Promise<number> {
    const url = this.config.getOrThrow<string>('nhtsa.allMakesUrl');

    try {
      const response = await this.client.get<Readable>(url, {
        responseType: 'stream',
      });

      return await this.parseAllMakesStream(
        response.data,
        batchSize,
        onBatch,
        limit,
      );
    } catch (error) {
      this.logger.error({ err: error, url }, 'NHTSA XML stream failed');
      throw error;
    }
  }

  private async fetchXml(url: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.client.get<string>(url);

      return (await parseStringPromise(response.data, {
        explicitArray: false,
        trim: true,
      })) as Record<string, unknown>;
    } catch (error) {
      this.logger.error({ err: error, url }, 'NHTSA XML request failed');
      throw error;
    }
  }

  private parseAllMakesStream(
    source: Readable,
    batchSize: number,
    onBatch: (batch: RawVehicleMake[]) => Promise<void>,
    limit: number,
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const parser = sax.createStream(true, { trim: true });
      let currentMake: RawVehicleMake | null = null;
      let currentTag = '';
      let batch: RawVehicleMake[] = [];
      let selectedCount = 0;
      let pendingFlush = Promise.resolve();
      let settled = false;

      const finishWithError = (error: unknown) => {
        if (settled) {
          return;
        }

        settled = true;
        source.destroy();
        reject(error instanceof Error ? error : new Error(String(error)));
      };

      const localName = (name: string) => name.split(':').pop() ?? name;

      const queueFlush = (records: RawVehicleMake[]) => {
        source.pause();
        pendingFlush = pendingFlush
          .then(() => onBatch(records))
          .then(() => {
            source.resume();
          })
          .catch(finishWithError);
      };

      parser.on('opentag', (node: sax.Tag) => {
        const tagName = localName(node.name);
        currentTag = tagName;

        if (tagName === 'AllVehicleMakes') {
          currentMake = {};
        }
      });

      parser.on('text', (text: string) => {
        if (!currentMake) {
          return;
        }

        if (currentTag === 'Make_ID') {
          currentMake.Make_ID = `${currentMake.Make_ID ?? ''}${text}`;
        }

        if (currentTag === 'Make_Name') {
          currentMake.Make_Name = `${currentMake.Make_Name ?? ''}${text}`;
        }
      });

      parser.on('closetag', (name: string) => {
        const tagName = localName(name);

        if (tagName === 'AllVehicleMakes' && currentMake) {
          if (limit === 0 || selectedCount < limit) {
            batch.push(currentMake);
            selectedCount += 1;
          }

          currentMake = null;

          if (batch.length >= batchSize) {
            const records = batch;
            batch = [];
            queueFlush(records);
          }
        }

        currentTag = '';
      });

      parser.on('error', finishWithError);
      source.on('error', finishWithError);

      parser.on('end', () => {
        pendingFlush
          .then(async () => {
            if (batch.length > 0) {
              await onBatch(batch);
            }
          })
          .then(() => {
            if (!settled) {
              settled = true;
              resolve(selectedCount);
            }
          })
          .catch(finishWithError);
      });

      source.pipe(parser);
    });
  }
}
