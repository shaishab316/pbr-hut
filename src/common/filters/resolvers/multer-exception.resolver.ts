import { HttpStatus } from '@nestjs/common';
import {
  IExceptionResolver,
  ResolvedError,
} from '../exception-resolver.interface';

export class MulterExceptionResolver implements IExceptionResolver {
  supports(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      (exception.message.includes('LIMIT_FILE_SIZE') ||
        exception.message.includes('LIMIT_UNEXPECTED_FILE'))
    );
  }

  resolve(exception: unknown): ResolvedError {
    const e = exception as Error;
    if (e.message.includes('LIMIT_FILE_SIZE')) {
      return {
        status: HttpStatus.PAYLOAD_TOO_LARGE,
        message: 'File too large',
      };
    }
    return { status: HttpStatus.BAD_REQUEST, message: 'Unexpected file field' };
  }
}
