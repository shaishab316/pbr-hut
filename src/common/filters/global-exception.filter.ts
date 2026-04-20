import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Request, Response } from 'express';
import {
  IExceptionResolver,
  ResolvedError,
} from './exception-resolver.interface';
import { PrismaExceptionResolver } from './resolvers/prisma-exception.resolver';
import { HttpExceptionResolver } from './resolvers/http-exception.resolver';
import { ZodExceptionResolver } from './resolvers/zod-exception.resolver';
import { JwtExceptionResolver } from './resolvers/jwt-exception.resolver';
import { MulterExceptionResolver } from './resolvers/multer-exception.resolver';
import { StripeExceptionResolver } from './resolvers/stripe-exception.resolver';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private resolvers: IExceptionResolver[] = [
    new ZodExceptionResolver(),
    new HttpExceptionResolver(),
    new PrismaExceptionResolver(),
    new JwtExceptionResolver(),
    new MulterExceptionResolver(),
    new StripeExceptionResolver(),
  ];

  constructor(@Inject(WINSTON_MODULE_PROVIDER) private logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const { status, message, errors } = this.resolve(exception);

    this.logger.error('Exception', {
      status,
      method: req.method,
      url: req.originalUrl,
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    res.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      message,
      ...(errors ? { errors } : {}),
    });
  }

  private resolve(exception: unknown): ResolvedError {
    const resolver = this.resolvers.find((r) => r.supports(exception));
    return resolver
      ? resolver.resolve(exception)
      : {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Something went wrong',
        };
  }
}
