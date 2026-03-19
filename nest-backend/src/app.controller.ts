import { Controller, Get } from '@nestjs/common';
import { Public } from './modules/auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor() {
    console.log('AppController loaded');
  }

  @Public()
  @Get('ping')
  ping() {
    console.log('PING OK');
    return 'ok';
  }

  @Public()
  @Get()
  getRoot() {
    return { status: 'ok', message: 'HeyDoctor NestJS API' };
  }

  @Public()
  @Get('health')
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('routes')
  getRoutes() {
    return {
      auth: 'POST /api/auth/login',
      health: 'GET /api/health',
    };
  }
}
