import { RiderProfile, User } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

// User-level fields (nested under `user:` in orderBy)
const userSortKeys = [
  'name',
  'email',
  'createdAt',
] as const satisfies ReadonlyArray<keyof User>;

// RiderProfile-level fields (top-level in orderBy)
const riderSortKeys = [
  'totalEarned',
  'availableBalance',
  'nidStatus',
  'isAvailable',
  'createdAt',
] as const satisfies ReadonlyArray<keyof RiderProfile>;

const allSortKeys = [
  ...userSortKeys.flatMap((k) => [`+${k}`, `-${k}`]),
  ...riderSortKeys.flatMap((k) => [`+${k}`, `-${k}`]),
] as Array<`${'+' | '-'}${(typeof userSortKeys)[number] | (typeof riderSortKeys)[number]}`>;

export const queryRiderSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: z.enum(['active', 'pending']).default('active'),
  orderBy: z.enum(allSortKeys as [string, ...string[]]).default('-createdAt'),
});

export class QueryRiderDto extends createZodDto(queryRiderSchema) {}
export const RIDER_PROFILE_SORT_KEYS = new Set<string>(riderSortKeys);
