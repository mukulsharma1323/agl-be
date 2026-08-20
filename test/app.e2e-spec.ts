import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { VehicleResolver } from '../src/vehicle-ingestion/presentation/vehicle.resolver';

describe('GraphQL API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('wires the GraphQL resolver to the configured datastore', async () => {
    const resolver = app.get(VehicleResolver);

    await expect(resolver.vehicleMakeCount()).resolves.toBe(0);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
