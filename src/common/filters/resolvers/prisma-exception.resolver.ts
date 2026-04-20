import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IExceptionResolver,
  ResolvedError,
} from '../exception-resolver.interface';

export class PrismaExceptionResolver implements IExceptionResolver {
  supports(exception: unknown): boolean {
    return (
      exception instanceof Prisma.PrismaClientKnownRequestError ||
      exception instanceof Prisma.PrismaClientUnknownRequestError ||
      exception instanceof Prisma.PrismaClientInitializationError ||
      exception instanceof Prisma.PrismaClientRustPanicError ||
      exception instanceof Prisma.PrismaClientValidationError
    );
  }

  resolve(exception: unknown): ResolvedError {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.resolveKnown(exception);
    }
    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database unavailable',
      };
    }
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid data provided',
      };
    }
    if (exception instanceof Prisma.PrismaClientRustPanicError) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database critical error',
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database error',
    };
  }

  private resolveKnown(e: Prisma.PrismaClientKnownRequestError): ResolvedError {
    switch (e.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: `${(e.meta?.target as string[])?.join(', ')} already exists`,
        };
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, message: 'Record not found' };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Related record not found',
        };
      case 'P2014':
        return { status: HttpStatus.BAD_REQUEST, message: 'Invalid relation' };
      case 'P2016':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Query interpretation error',
        };
      case 'P2021':
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Table does not exist',
        };
      case 'P2022':
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Column does not exist',
        };
      case 'P1001':
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database unreachable',
        };
      case 'P1002':
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database timeout',
        };
      case 'P1008':
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database operation timeout',
        };
      case 'P1017':
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database connection closed',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error',
        };
    }
  }
}
