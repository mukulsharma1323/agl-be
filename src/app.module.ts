import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLFormattedError } from 'graphql';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { LoggerModule } from './logging/logger.module';
import { VehicleIngestionModule } from './vehicle-ingestion/vehicle-ingestion.module';
import { VehicleMakeEntity } from './vehicle-ingestion/infrastructure/vehicle-make.entity';
import { validateConfig } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
    }),
    LoggerModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const database = config.getOrThrow<string>('databasePath');

        if (database !== ':memory:') {
          mkdirSync(dirname(database), { recursive: true });
        }

        return {
          type: 'sqlite',
          database,
          entities: [VehicleMakeEntity],
          synchronize: config.getOrThrow<boolean>('databaseSynchronize'),
        };
      },
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      path: '/graphql',
      formatError: (error): GraphQLFormattedError => ({
        message: error.message,
        locations: error.locations,
        path: error.path,
        extensions: {
          code: error.extensions?.code ?? 'INTERNAL_SERVER_ERROR',
        },
      }),
    }),
    VehicleIngestionModule,
  ],
})
export class AppModule {}
