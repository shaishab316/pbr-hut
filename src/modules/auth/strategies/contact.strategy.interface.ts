import type { SafeUser } from '@/common/types/safe-user.type';
import type { UnverifiedUser } from '../repository/auth.cache.repository';
import { LoginInput } from '../dto/login.dto';
import { User } from '@prisma/client';

export const CONTACT_STRATEGIES = Symbol('CONTACT_STRATEGIES');

//? Narrows the union to a specific contactType branch
export type NarrowLoginInput<T extends LoginInput['contactType']> = Extract<
  LoginInput,
  { contactType: T }
>;

export interface IContactStrategy<
  T extends LoginInput['contactType'] = LoginInput['contactType'],
> {
  readonly contactType: T;
  getIdentifier(dto: NarrowLoginInput<T>): string;
  getIdentifierFromCache(user: UnverifiedUser): string;
  findExistingUser(dto: NarrowLoginInput<T>): Promise<SafeUser | null>;
  findExistingUserWithPassword(dto: NarrowLoginInput<T>): Promise<User | null>;
  sendVerification(dto: UnverifiedUser, otp: string): Promise<void>;
  buildContactFields(dto: NarrowLoginInput<T>): Partial<Record<T, string>>;
}
