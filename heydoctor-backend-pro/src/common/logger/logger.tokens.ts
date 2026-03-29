/**
 * Injection token for the single application-wide structured logger.
 * Symbol avoids collisions with string tokens from dependencies.
 * Use {@link AppLoggerService} as the TypeScript type at injection sites.
 */
export const APP_LOGGER = Symbol('APP_LOGGER');
