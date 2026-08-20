import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleMakeEntity } from './infrastructure/vehicle-make.entity';
import { NhtsaClient } from './infrastructure/nhtsa.client';
import { VehicleRepository } from './infrastructure/vehicle.repository';
import { VehicleResolver } from './presentation/vehicle.resolver';
import { VehicleIngestionService } from './vehicle-ingestion.service';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleMakeEntity])],
  providers: [
    NhtsaClient,
    VehicleRepository,
    VehicleIngestionService,
    VehicleResolver,
  ],
})
export class VehicleIngestionModule {}
