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
    const zodError = exception.getZodError?.();
    const errors = zodError?.errors as ZodIssue[] | undefined;

    return {
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      message: 'Validation failed',
      ...(errors && errors.length > 0
        ? {
            errors: errors.map((err) => ({
              field: err.path?.join('.') || 'unknown',
              message: err.message,
            })),
          }
        : {}),
    };
  }
}
