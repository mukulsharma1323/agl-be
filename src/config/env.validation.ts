import { z } from 'zod';

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  if (value.toLowerCase() === 'true') {
    return true;
  }

  if (value.toLowerCase() === 'false') {
    return false;
  }

  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_PATH: z.string().min(1).default('data/vehicles.sqlite'),
  DATABASE_SYNCHRONIZE: booleanFromEnv.optional(),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  NHTSA_ALL_MAKES_URL: z
    .string()
    .url()
    .default('https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=XML'),
  NHTSA_VEHICLE_TYPES_URL_TEMPLATE: z
    .string()
    .min(1)
    .default(
      'https://vpic.nhtsa.dot.gov/api/vehicles/GetVehicleTypesForMakeId/{makeId}?format=xml',
    ),
  HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  INGESTION_CONCURRENCY: z.coerce.number().int().positive().default(8),
  INGESTION_MAX_MAKES: z.coerce.number().int().min(0).default(0),
  INGEST_ON_STARTUP: booleanFromEnv.default(false),
});

export type AppConfig = ReturnType<typeof validateConfig>;

export function validateConfig(config: Record<string, unknown>) {
  const parsed = envSchema.parse(config);

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    databasePath: parsed.DATABASE_PATH,
    databaseSynchronize:
      parsed.DATABASE_SYNCHRONIZE ?? parsed.NODE_ENV !== 'production',
    logLevel: parsed.LOG_LEVEL,
    nhtsa: {
      allMakesUrl: parsed.NHTSA_ALL_MAKES_URL,
      vehicleTypesUrlTemplate: parsed.NHTSA_VEHICLE_TYPES_URL_TEMPLATE,
      timeoutMs: parsed.HTTP_TIMEOUT_MS,
    },
    ingestion: {
      concurrency: parsed.INGESTION_CONCURRENCY,
      maxMakes: parsed.INGESTION_MAX_MAKES,
      ingestOnStartup: parsed.INGEST_ON_STARTUP,
    },
  };
}
