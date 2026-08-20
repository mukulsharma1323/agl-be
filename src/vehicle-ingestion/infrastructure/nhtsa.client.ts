import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { parseStringPromise } from 'xml2js';
import { APP_LOGGER } from '../../logging/logger.module';
import type { AppLogger } from '../../logging/logger.types';

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

  async fetchAllMakesXml(): Promise<Record<string, unknown>> {
    return this.fetchXml(this.config.getOrThrow<string>('nhtsa.allMakesUrl'));
  }

  async fetchVehicleTypesXml(makeId: number): Promise<Record<string, unknown>> {
    const template = this.config.getOrThrow<string>(
      'nhtsa.vehicleTypesUrlTemplate',
    );

    return this.fetchXml(template.replace('{makeId}', String(makeId)));
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
}
