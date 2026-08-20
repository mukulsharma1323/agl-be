import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { VehicleType } from '../domain/vehicle.types';

@ObjectType()
export class VehicleTypeObject implements VehicleType {
  @Field(() => Int, { description: 'NHTSA vehicle type identifier.' })
  typeId!: number;

  @Field({ description: 'NHTSA vehicle type name.' })
  typeName!: string;
}

@ObjectType()
@Entity('vehicle_makes')
export class VehicleMakeEntity {
  @Field(() => Int, { description: 'NHTSA make identifier.' })
  @PrimaryColumn({ type: 'integer' })
  makeId!: number;

  @Field({ description: 'Vehicle make name from NHTSA.' })
  @Column({ type: 'varchar', length: 255 })
  makeName!: string;

  @Field(() => [VehicleTypeObject], {
    description: 'Vehicle types associated with this make.',
  })
  @Column({ type: 'simple-json' })
  vehicleTypes!: VehicleType[];

  @Field({ description: 'First time this make was persisted.' })
  @CreateDateColumn()
  createdAt!: Date;

  @Field({ description: 'Most recent refresh timestamp for this make.' })
  @UpdateDateColumn()
  updatedAt!: Date;
}
