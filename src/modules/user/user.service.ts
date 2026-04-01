import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { UserRole } from '@prisma/client';
import { RiderRepository } from '../rider/repositories/rider.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly riderRepository: RiderRepository,
  ) {}

  async getMe(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.RIDER) {
      const riderProfile = await this.riderRepository.findById(userId);

      Object.assign(user, {
        riderProfile: {
          ...riderProfile,
          userId: undefined, //? not needed
        },
      });
    }

    return user;
  }
}
