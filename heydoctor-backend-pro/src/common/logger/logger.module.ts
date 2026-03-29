import { Global, Module } from '@nestjs/common';
import { AppLoggerService } from './app-logger.service';
import { APP_LOGGER } from './logger.tokens';

/** Application-wide logger context (Nest Logger prefix). */
export const APP_LOGGER_CONTEXT = 'HeyDoctor';

/**
 * Global logging infrastructure. @Global is intentional: HTTP interceptors
 * registered with APP_INTERCEPTOR must resolve the logger reliably across the
 * module graph without depending on per-feature import order.
 *
 * - APP_LOGGER: canonical token (use @Inject(APP_LOGGER)).
 * - AppLoggerService: useExisting alias so Nest can also resolve by class token /
 *   reflect-metadata (avoids "AppLoggerService at index [2]" failures).
 */
@Global()
@Module({
  providers: [
    {
      provide: APP_LOGGER,
      useFactory: () => new AppLoggerService(APP_LOGGER_CONTEXT),
    },
    {
      provide: AppLoggerService,
      useExisting: APP_LOGGER,
    },
  ],
  exports: [APP_LOGGER, AppLoggerService],
})
export class LoggerModule {}
