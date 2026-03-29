import { Global, Module } from '@nestjs/common';
import { AppLoggerService } from './app-logger.service';

/** Application-wide logger context (shown as Nest Logger prefix). */
export const APP_LOGGER_CONTEXT = 'HeyDoctor';

/**
 * Central logging infrastructure.
 * Single registration of {@link AppLoggerService} for the whole app — avoids
 * duplicate providers and DI ambiguity. Correlation IDs still come from
 * {@link getCurrentRequestId} inside the service.
 */
@Global()
@Module({
  providers: [
    {
      provide: AppLoggerService,
      useFactory: () => new AppLoggerService(APP_LOGGER_CONTEXT),
    },
  ],
  exports: [AppLoggerService],
})
export class LoggerModule {}
