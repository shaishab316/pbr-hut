import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const res = context.switchToHttp().getResponse();

    return next.handle().pipe(map((data) => this.buildResponse(data, res)));
  }

  private buildResponse(data: any, res: Response) {
    const statusCode = res.statusCode;

    if (data?.__cache) {
      const { __cache, ...rest } = data;
      res.setHeader('X-Cache', __cache);
      data = rest;
    }

    if (data?.meta) {
      return {
        success: true,
        statusCode,
        message: data.message ?? 'Success',
        data: data.data,
        meta: data.meta,
      };
    }

    if (data?.message) {
      return {
        success: true,
        statusCode,
        message: data.message,
        data: data.data ?? null,
      };
    }

    return { success: true, statusCode, message: 'Success', data };
  }
}
