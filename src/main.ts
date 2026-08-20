import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { APP_LOGGER } from './logging/logger.module';
import { AppLogger } from './logging/logger.types';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = app.get<AppLogger>(APP_LOGGER);
  const port = config.getOrThrow<number>('port');

  app.enableShutdownHooks();

  process.on('SIGTERM', () => logger.info('application shutdown requested'));
  process.on('SIGINT', () => logger.info('application shutdown requested'));

  await app.listen(port);
  logger.info({ port }, 'application listening');
}
void bootstrap();
