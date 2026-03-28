import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthCacheRepository } from './repository/auth.cache.repository';
import type { SignUpInput } from './dto/sign-up.dto';
import { hashPassword } from '@/common/helpers';
import { ContactStrategyFactory } from './strategies/contact.strategy.factory';

@Injectable()
export class AuthService {
  constructor(
    private readonly authCacheRepo: AuthCacheRepository,
    private readonly contactStrategyFactory: ContactStrategyFactory,
  ) {}

  async signUp(signUpDto: SignUpInput) {
    const strategy = this.contactStrategyFactory.resolve(signUpDto.contactType);

    const existingUser = await strategy.findExistingUser(signUpDto);
    if (existingUser) {
      throw new BadRequestException(
        'Already have an account with this identifier, please login instead',
      );
    }

    const identifier = strategy.getIdentifier(signUpDto);

    const unverifiedUser = {
      name: signUpDto.name,
      ...strategy.buildContactFields(signUpDto),
      password: await hashPassword(signUpDto.password),
      createdAt: new Date(),
    };

    await this.authCacheRepo.saveUnverifiedUser(identifier, unverifiedUser);
    await strategy.sendVerification(signUpDto);

    return { message: 'Verification sent', identifier };
  }
}
