import { HttpStatus } from '@nestjs/common';
import {
  IExceptionResolver,
  ResolvedError,
} from '../exception-resolver.interface';

export class StripeExceptionResolver implements IExceptionResolver {
  supports(exception: unknown): boolean {
    return (
      exception !== null &&
      typeof exception === 'object' &&
      'type' in exception &&
      typeof (exception as any).type === 'string' &&
      (exception as any).type.startsWith('Stripe')
    );
  }

  resolve(exception: unknown): ResolvedError {
    return {
      status: HttpStatus.PAYMENT_REQUIRED,
      message: (exception as any).message || 'Payment error',
    };
  }
}
