import { Injectable } from '@nestjs/common';
import { AuthCacheRepository } from './repository/auth.cache.repository';
import type { SignUpInput } from './dto/sign-up.dto';
import { hashPassword } from '@/common/helpers';

@Injectable()
export class AuthService {
  constructor(private readonly cacheRepo: AuthCacheRepository) {}

  async signUp(signUpDto: SignUpInput) {
    const identifier = this.extractIdentifier(signUpDto);
    const unverifiedUser = await this.buildUnverifiedUser(signUpDto);

    //? non verified user is stored in cache with a TTL, after verification it will be moved to the database
    await this.cacheRepo.saveUnverifiedUser(identifier, unverifiedUser);

    return { message: 'Verification sent', identifier };
  }

  private extractIdentifier(dto: SignUpInput): string {
    return dto.contactType === 'email' ? dto.email : dto.phone;
  }

  private async buildUnverifiedUser(dto: SignUpInput) {
    return {
      name: dto.name,
      email: dto.contactType === 'email' ? dto.email : undefined,
      phone: dto.contactType === 'phone' ? dto.phone : undefined,
      password: await hashPassword(dto.password),
      createdAt: new Date(),
    };
  }
}
