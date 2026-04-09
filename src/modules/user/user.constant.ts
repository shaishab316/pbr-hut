import { User } from '@prisma/client';

export const userSearchableFields = [
  'id',
  'name',
  'email',
  'phone',
] as const satisfies ReadonlyArray<keyof User>;
