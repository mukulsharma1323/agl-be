import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleMake } from '../domain/vehicle.types';
import { VehicleMakeEntity } from './vehicle-make.entity';

@Injectable()
export class VehicleRepository {
  constructor(
    @InjectRepository(VehicleMakeEntity)
    private readonly repository: Repository<VehicleMakeEntity>,
  ) {}

  async upsertMany(makes: VehicleMake[]): Promise<void> {
    await this.repository.upsert(makes, ['makeId']);
  }

  async findAll(limit: number, offset: number): Promise<VehicleMakeEntity[]> {
    return this.repository.find({
      order: { makeName: 'ASC' },
      take: limit,
      skip: offset,
    });
  }

  async findOne(makeId: number): Promise<VehicleMakeEntity | null> {
    return this.repository.findOneBy({ makeId });
  }

  async count(): Promise<number> {
    return this.repository.count();
  }
}
