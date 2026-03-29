import type { SafeUser } from '@/common/types/safe-user.type';
import type { UnverifiedUser } from '../repository/auth.cache.repository';
import { LoginInput } from '../dto/login.dto';
import { User } from '@prisma/client';

export const CONTACT_STRATEGIES = Symbol('CONTACT_STRATEGIES');

//? Narrows the union to a specific identifierType branch
export type NarrowLoginInput<T extends LoginInput['identifierType']> = Extract<
  LoginInput,
  { identifierType: T }
>;

export interface IContactStrategy<
  T extends LoginInput['identifierType'] = LoginInput['identifierType'],
> {
  readonly identifierType: T;
  getIdentifier(dto: NarrowLoginInput<T>): string;
  getIdentifierFromCache(user: UnverifiedUser): string;
  findExistingUser(dto: NarrowLoginInput<T>): Promise<SafeUser | null>;
  findExistingUserWithPassword(dto: NarrowLoginInput<T>): Promise<User | null>;
  sendVerification(dto: UnverifiedUser, otp: string): Promise<void>;
  buildContactFields(dto: NarrowLoginInput<T>): Partial<Record<T, string>>;
}
