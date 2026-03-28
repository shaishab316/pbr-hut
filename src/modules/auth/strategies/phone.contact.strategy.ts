import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRepository } from '../../user/repositories/user.repository';
import {
  IContactStrategy,
  NarrowSignUpInput,
} from './contact.strategy.interface';

type PhoneInput = NarrowSignUpInput<'phone'>;

@Injectable()
export class PhoneContactStrategy implements IContactStrategy<'phone'> {
  readonly contactType = 'phone' as const;

  constructor(private readonly userRepo: UserRepository) {}

  getIdentifier(dto: PhoneInput): string {
    return dto.phone; // ✅
  }

  buildContactFields(dto: PhoneInput) {
    return { phone: dto.phone }; // ✅
  }

  async findExistingUser(dto: PhoneInput) {
    return this.userRepo.findByPhone(dto.phone); // ✅
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/require-await
  async sendVerification(_dto: PhoneInput, _otp: string): Promise<void> {
    // TODO: SMS OTP
    throw new BadRequestException('Phone verification not implemented yet');
  }
}
