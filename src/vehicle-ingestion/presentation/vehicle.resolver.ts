import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { VehicleIngestionService } from '../vehicle-ingestion.service';
import { VehicleRepository } from '../infrastructure/vehicle.repository';
import { VehicleMakeEntity } from '../infrastructure/vehicle-make.entity';
import { IngestionResult } from '../domain/vehicle.types';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
class IngestionResultObject implements IngestionResult {
  @Field(() => Int)
  requestedMakes!: number;

  @Field(() => Int)
  savedMakes!: number;

  @Field(() => Int)
  failedMakes!: number;
}

@Resolver(() => VehicleMakeEntity)
export class VehicleResolver {
  constructor(
    private readonly ingestion: VehicleIngestionService,
    private readonly vehicles: VehicleRepository,
  ) {}

  @Query(() => [VehicleMakeEntity], {
    description: 'Returns transformed vehicle make data from the datastore.',
  })
  vehicleMakes(
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 50 })
    limit: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 })
    offset: number,
  ) {
    return this.vehicles.findAll(Math.min(limit, 500), Math.max(offset, 0));
  }

  @Query(() => VehicleMakeEntity, {
    nullable: true,
    description: 'Returns a single transformed vehicle make by NHTSA make id.',
  })
  vehicleMake(@Args('makeId', { type: () => Int }) makeId: number) {
    return this.vehicles.findOne(makeId);
  }

  @Query(() => Int, {
    description: 'Returns the number of vehicle makes stored locally.',
  })
  vehicleMakeCount() {
    return this.vehicles.count();
  }

  @Mutation(() => IngestionResultObject, {
    description:
      'Pulls NHTSA XML, transforms it to unified JSON, and upserts it.',
  })
  ingestVehicleData(
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    return this.ingestion.ingest(limit);
  }
}
