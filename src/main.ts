import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import chalk from 'chalk';
import compression from 'compression';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import { setupApiDocs } from './common/config/api-docs.config';
import type { Env } from './common/config/app.config';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('🚀 Starting application bootstrap...');

  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const config = app.get(ConfigService<Env, true>);
  logger.log('✅ Configuration loaded successfully');

  //? security headers
  logger.log('⚔️  Configuring security headers...');
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/docs')) {
      helmet({ contentSecurityPolicy: false })(req, res, next);
    } else {
      helmet()(req, res, next);
    }
  });

  //? cors
  const corsOrigin = config.get('CORS_ORIGIN', { infer: true });
  logger.log(`📡 CORS enabled for origin: ${corsOrigin.toString()}`);
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  //? gzip compression
  logger.log('🗜️  Gzip compression enabled');
  app.use(compression());

  //? global prefix
  logger.log('🔧 Setting global prefix to /api/v1');
  app.setGlobalPrefix('api/v1');

  //? global pipes — zod validation
  logger.log('✔️  Zod validation pipe configured');
  app.useGlobalPipes(new ZodValidationPipe());

  //? global interceptors
  logger.log('🎯 Global interceptors registered (Response, Cache)');
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalInterceptors(app.get(CacheInterceptor));

  //? global exception filter
  logger.log('🛡️  Global exception filter configured');
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(
    new GlobalExceptionFilter({ httpAdapter } as HttpAdapterHost),
  );

  logger.log('📖 Setting up API documentation...');
  setupApiDocs(app);

  //? Enable shutdown hooks to allow graceful shutdown of the application
  logger.log('🔄 Graceful shutdown hooks enabled');
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  await app.listen(port);

  const appUrl = await app.getUrl();
  logger.log(`✨ Application is running on: ${chalk.blue(appUrl)}`);
}

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ Failed to start application', err);
  process.exit(1);
});
