import 'dotenv/config';
console.log('🔥 CORRECT MAIN EXECUTED');

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('[BOOTSTRAP] Starting NestJS bootstrap...');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });
  console.log('BOOTSTRAP MODULE:', AppModule.name);
  console.log('[BOOTSTRAP] AppModule created, setting global prefix...');

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`[BOOTSTRAP] Application is running on port ${port}`);

  try {
    const httpAdapter = app.getHttpAdapter();
    const expressApp = httpAdapter.getInstance() as { _router?: { stack: Array<{ route?: { methods: Record<string, unknown>; path: string } }> }; router?: { stack: Array<{ route?: { methods: Record<string, unknown>; path: string } }> } };
    const router = expressApp._router ?? expressApp.router;
    if (router?.stack) {
      const routes = router.stack
        .filter((r) => r.route)
        .map((r) => `${Object.keys(r.route!.methods)} ${r.route!.path}`)
        .filter(Boolean);
      console.log('REGISTERED ROUTES:', routes);
    }
  } catch (err) {
    console.warn('[BOOTSTRAP] Could not list routes:', err);
  }
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
