import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino from 'pino';
import pinoHttp from 'pino-http';

export const APP_LOGGER = Symbol('APP_LOGGER');

@Global()
@Module({
  providers: [
    {
      provide: APP_LOGGER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        pino({
          level: config.getOrThrow<string>('logLevel'),
          base: undefined,
          timestamp: pino.stdTimeFunctions.isoTime,
        }),
    },
  ],
  exports: [APP_LOGGER],
})
export class LoggerModule implements NestModule {
  constructor(private readonly config: ConfigService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        pinoHttp({
          level: this.config.getOrThrow<string>('logLevel'),
          base: undefined,
          timestamp: pino.stdTimeFunctions.isoTime,
        }),
      )
      .forRoutes('*');
  }
}
