import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { type Prisma, UserRole } from '@prisma/client';

import { RedisService } from '@/infra/redis/redis.service';
import type { SignUpInput } from '../dto/sign-up.dto';

/**
 * TTLs are in seconds (Redis EX).
 * Keep them centralized so they’re easy to audit and change.
 */
const TTL_SECONDS = {
  UNVERIFIED_USER: 15 * 60, // 15 minutes
  PASSWORD_RESET_NONCE: 10 * 60, // 10 minutes
} as const;

export type SignupData = Pick<
  Prisma.UserCreateInput,
  'name' | 'email' | 'phone' | 'passwordHash' | 'createdAt'
> & {
  identifierType: SignUpInput['identifierType'];
};

export type UnverifiedUser = SignupData & {
  role: typeof UserRole.CUSTOMER;
};

export type UnverifiedRider = SignupData & {
  latitude: number;
  longitude: number;
  role: typeof UserRole.RIDER;
};

export type UnverifiedEntity = UnverifiedUser | UnverifiedRider;

/**
 * A small, explicit, typed cache “repository” for auth-related transient data.
 *
 * Goals:
 * - one place for keys + TTLs
 * - typed reads/writes
 * - consistent naming (“create / get / delete”)
 * - no duplication of Redis key selection lambdas
 */
@Injectable()
export class AuthCacheRepository {
  constructor(private readonly redis: RedisService) {}

  // ---------------------------------------------------------------------------
  // Key selectors (single source of truth)
  // NOTE: keeping them as fields avoids re-allocating lambdas at each call site.
  // ---------------------------------------------------------------------------

  private unverifiedUserKey(identifier: string) {
    return (ctx: any) => ctx.AUTH.UNVERIFIED_USER(identifier);
  }

  private passwordResetNonceKey(userId: string) {
    return (ctx: any) => ctx.AUTH.PASSWORD_RESET(userId);
  }

  // ---------------------------------------------------------------------------
  // Unverified signup cache
  // ---------------------------------------------------------------------------

  /** Store unverified user data (short-lived, expires automatically). */
  async saveUnverifiedUser<T extends UnverifiedEntity>(
    identifier: string,
    data: T,
  ): Promise<void> {
    await this.redis.set(
      this.unverifiedUserKey(identifier),
      data,
      TTL_SECONDS.UNVERIFIED_USER,
    );
  }

  /** Fetch unverified user data (null if missing/expired). */
  async getUnverifiedUser<T extends UnverifiedEntity>(
    identifier: string,
  ): Promise<T | null> {
    return this.redis.get<T>(this.unverifiedUserKey(identifier));
  }

  /** Remove unverified user data explicitly (optional; TTL also clears it). */
  async deleteUnverifiedUser(identifier: string): Promise<void> {
    await this.redis.del(this.unverifiedUserKey(identifier));
  }

  // ---------------------------------------------------------------------------
  // Password reset nonce cache
  // ---------------------------------------------------------------------------

  /**
   * Create and store a one-time password reset nonce.
   * The nonce is stored keyed by userId and expires automatically.
   */
  async createPasswordResetNonce(userId: string): Promise<string> {
    const nonce = randomUUID();

    await this.redis.set(
      this.passwordResetNonceKey(userId),
      nonce,
      TTL_SECONDS.PASSWORD_RESET_NONCE,
    );

    return nonce;
  }

  /** Get the password reset nonce (null if missing/expired). */
  async getPasswordResetNonce(userId: string): Promise<string | null> {
    return this.redis.get<string>(this.passwordResetNonceKey(userId));
  }

  /** Delete the password reset nonce explicitly (e.g., after successful reset). */
  async deletePasswordResetNonce(userId: string): Promise<void> {
    await this.redis.del(this.passwordResetNonceKey(userId));
  }
}
