/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */
import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRepository } from '../../user/repositories/user.repository';
import {
  IContactStrategy,
  NarrowLoginInput,
} from './contact.strategy.interface';
import type {
  UnverifiedRider,
  UnverifiedUser,
} from '../repository/auth.cache.repository';
import { SafeUser } from '@/common/types/safe-user.type';

type PhoneInput = NarrowLoginInput<'phone'>;

@Injectable()
export class PhoneContactStrategy implements IContactStrategy<'phone'> {
  readonly identifierType = 'phone' as const;

  constructor(private readonly userRepo: UserRepository) {}

  getIdentifier(dto: PhoneInput): string {
    return dto.phone;
  }

  getIdentifierFromCache<T extends UnverifiedUser | UnverifiedRider>(user: T) {
    return user.phone!;
  }

  buildContactFields(dto: PhoneInput) {
    return { phone: dto.phone };
  }

  async findExistingUser(dto: PhoneInput) {
    return this.userRepo.findByPhone(dto.phone);
  }

  async findExistingUserWithPassword(dto: PhoneInput) {
    return this.userRepo.findByPhoneWithPassword(dto.phone);
  }

  async sendVerification<T extends UnverifiedUser | UnverifiedRider>(
    _dto: T,
    _otp: string,
  ): Promise<void> {
    // TODO: SMS OTP
    throw new BadRequestException('Phone verification not implemented yet');
  }

  async sendPasswordReset(user: SafeUser, otp: string): Promise<void> {
    // TODO: SMS OTP
    throw new BadRequestException('Phone password reset not implemented yet');
  }
}
