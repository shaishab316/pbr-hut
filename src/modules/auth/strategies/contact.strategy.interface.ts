import { SafeUser } from '@/common/types/safe-user.type';
import type { SignUpInput } from '../dto/sign-up.dto';

export const CONTACT_STRATEGIES = Symbol('CONTACT_STRATEGIES');

//? Narrows the union to a specific contactType branch
export type NarrowSignUpInput<T extends SignUpInput['contactType']> = Extract<
  SignUpInput,
  { contactType: T }
>;

export interface IContactStrategy<
  T extends SignUpInput['contactType'] = SignUpInput['contactType'],
> {
  readonly contactType: T;
  getIdentifier(dto: NarrowSignUpInput<T>): string;
  findExistingUser(dto: NarrowSignUpInput<T>): Promise<SafeUser | null>;
  sendVerification(dto: NarrowSignUpInput<T>, otp: string): Promise<void>;
  buildContactFields(
    dto: NarrowSignUpInput<T>,
  ): Partial<Record<'email' | 'phone', string>>;
}
