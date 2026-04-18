import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { UserRole } from '@prisma/client';
import { RiderRepository } from '../rider/repositories/rider.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import { comparePassword, hashPassword } from '@/common/helpers';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CloudinaryService } from '../upload/cloudinary.service';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly riderRepository: RiderRepository,
    private readonly cloudinary: CloudinaryService,
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

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findByIdWithPassword(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid =
      user.passwordHash &&
      (await comparePassword(dto.currentPassword, user.passwordHash));

    if (!isPasswordValid) {
      throw new NotFoundException('Current password is incorrect');
    }

    const newHashedPassword = await hashPassword(dto.newPassword);

    await this.userRepository.update(userId, {
      passwordHash: newHashedPassword,
    });
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    profilePictureFile?: Express.Multer.File,
  ) {
    const updateData: Parameters<typeof this.userRepository.update>[1] = {
      ...dto,
    };

    if (profilePictureFile) {
      const uploaded = await this.cloudinary.uploadFile({
        file: profilePictureFile,
        folder: 'profile-pictures',
        resourceType: 'image',
      });

      updateData.profilePicture = uploaded.url;
    }

    return this.userRepository.update(userId, updateData);
  }
}
