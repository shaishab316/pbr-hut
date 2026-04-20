import { HttpException } from '@nestjs/common';
import {
  IExceptionResolver,
  ResolvedError,
} from '../exception-resolver.interface';

export class HttpExceptionResolver implements IExceptionResolver {
  supports(exception: unknown): boolean {
    return exception instanceof HttpException;
  }

  resolve(exception: unknown): ResolvedError {
    const e = exception as HttpException;
    const response = e.getResponse();
    const message =
      typeof response === 'string'
        ? response
        : (response as any).message || 'Request failed';
    return { status: e.getStatus(), message };
  }
}
