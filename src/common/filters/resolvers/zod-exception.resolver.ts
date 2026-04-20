import { HttpStatus } from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import {
  IExceptionResolver,
  ResolvedError,
} from '../exception-resolver.interface';
import { ZodIssue } from 'zod/v3';

export class ZodExceptionResolver implements IExceptionResolver {
  supports(exception: unknown): boolean {
    return exception instanceof ZodValidationException;
  }

  resolve(exception: any): ResolvedError {
    const errors = exception.getZodError().errors as ZodIssue[];

    return {
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      message: 'Validation failed',
      errors: errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    };
  }
}
