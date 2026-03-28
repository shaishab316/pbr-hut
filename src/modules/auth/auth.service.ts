import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthCacheRepository } from './repository/auth.cache.repository';
import type { SignUpInput } from './dto/sign-up.dto';
import { hashPassword } from '@/common/helpers';
import { UserRepository } from '../user/repositories/user.repository';
import { Queue } from 'bullmq';
import { MAIL_QUEUE, MailJobs } from '@/common/mail/mail.constants';
import { InjectQueue } from '@nestjs/bullmq';
import { WelcomeJobData } from '@/common/mail/mail.processor';

@Injectable()
export class AuthService {
  constructor(
    private readonly authCacheRepo: AuthCacheRepository,
    private readonly userRepo: UserRepository,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {}

  async signUp(signUpDto: SignUpInput) {
    const existingUser = await this.checkIfUserExists(signUpDto);

    if (existingUser) {
      throw new BadRequestException(
        'Already have an account with this identifier, please login instead',
      );
    }

    const identifier = this.extractIdentifier(signUpDto);
    const unverifiedUser = await this.buildUnverifiedUser(signUpDto);

    //? non verified user is stored in cache with a TTL, after verification it will be moved to the database
    await this.authCacheRepo.saveUnverifiedUser(identifier, unverifiedUser);

    await this.sendVerification(signUpDto);

    return { message: 'Verification sent', identifier };
  }

  private extractIdentifier(dto: SignUpInput): string {
    switch (dto.contactType) {
      case 'email':
        return dto.email;
      case 'phone':
        return dto.phone;
      default:
        //? This case should never happen due to validation, but we throw an error just in case
        throw new BadRequestException('Invalid contact type');
    }
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

  private async checkIfUserExists(dto: SignUpInput) {
    switch (dto.contactType) {
      case 'email':
        return await this.userRepo.findByEmail(dto.email);
      case 'phone':
        return await this.userRepo.findByPhone(dto.phone);
      default:
        return null;
    }
  }

  private async sendVerification(dto: SignUpInput) {
    switch (dto.contactType) {
      case 'email':
        await this.mailQueue.add(
          MailJobs.WELCOME,
          {
            email: dto.email,
            name: dto.name,
            otp: '123456' /** Todo: Generate a real OTP */,
          } satisfies WelcomeJobData,
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: { age: 15 * 60 },
          },
        );
        break;
      case 'phone':
        throw new BadRequestException('Phone verification not implemented yet');
      default:
        throw new BadRequestException('Invalid contact type for verification');
    }
  }
}
