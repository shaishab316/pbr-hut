import type { SafeUser } from '@/common/types/safe-user.type';
import type {
  UnverifiedRider,
  UnverifiedUser,
} from '../repository/auth.cache.repository';
import { User } from '@prisma/client';

type LoginInput =
  | {
      identifierType: 'email';
      email: string;
    }
  | {
      identifierType: 'phone';
      phone: string;
    };

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
  getIdentifierFromCache<T extends UnverifiedUser | UnverifiedRider>(
    user: T,
  ): string;
  findExistingUser(dto: NarrowLoginInput<T>): Promise<SafeUser | null>;
  findExistingUserWithPassword(dto: NarrowLoginInput<T>): Promise<User | null>;
  sendVerification<T extends UnverifiedUser | UnverifiedRider>(
    dto: T,
    otp: string,
  ): Promise<void>;
  sendPasswordReset(user: SafeUser, otp: string): Promise<void>;
  buildContactFields(dto: NarrowLoginInput<T>): Partial<Record<T, string>>;
}
