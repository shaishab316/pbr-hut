import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import chalk from 'chalk';
import compression from 'compression';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import { setupApiDocs } from './common/config/api-docs.config';
import type { Env } from './common/config/app.config';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import {
  WINSTON_MODULE_NEST_PROVIDER,
  WINSTON_MODULE_PROVIDER,
} from 'nest-winston';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const config = app.get(ConfigService<Env, true>);

  //? security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/docs')) {
      helmet({ contentSecurityPolicy: false })(req, res, next);
    } else {
      helmet()(req, res, next);
    }
  });

  //? cors
  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }), // e.g 'http://localhost:3000'
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  //? gzip compression
  app.use(compression());

  //? global prefix
  app.setGlobalPrefix('api/v1');

  //? global pipes — zod validation
  app.useGlobalPipes(new ZodValidationPipe());

  //? global interceptors
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalInterceptors(app.get(CacheInterceptor));

  //? global exception filter
  app.useGlobalFilters(
    new GlobalExceptionFilter(app.get(WINSTON_MODULE_PROVIDER)),
  );

  setupApiDocs(app);

  //? Enable shutdown hooks to allow graceful shutdown of the application
  app.enableShutdownHooks();

  await app.listen(config.get('PORT', { infer: true }));

  Logger.log(
    `Application is running on: ${chalk.blue(await app.getUrl())}`,
    'Bootstrap',
  );
}

bootstrap().catch((err) => {
  console.error('Error starting the application', err);
  process.exit(1);
});
