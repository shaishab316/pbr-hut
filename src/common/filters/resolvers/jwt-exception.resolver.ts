import { HttpStatus } from '@nestjs/common';
import {
  IExceptionResolver,
  ResolvedError,
} from '../exception-resolver.interface';

const JWT_ERRORS: Record<string, ResolvedError> = {
  JsonWebTokenError: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Invalid token',
  },
  TokenExpiredError: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Token expired',
  },
  NotBeforeError: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Token not active',
  },
};

export class JwtExceptionResolver implements IExceptionResolver {
  supports(exception: unknown): boolean {
    return exception instanceof Error && exception.name in JWT_ERRORS;
  }

  resolve(exception: unknown): ResolvedError {
    const e = exception as Error;
    return JWT_ERRORS[e.name];
  }
}
