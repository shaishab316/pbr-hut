import { Item } from '@prisma/client';

export const ITEM_SEARCH_FIELDS = [
  'name',
  'description',
] as const satisfies ReadonlyArray<keyof Item>;
