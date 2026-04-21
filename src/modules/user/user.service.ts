import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { UserRole } from '@prisma/client';
import { RiderRepository } from '../rider/repositories/rider.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import { comparePassword, hashPassword } from '@/common/helpers';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CloudinaryService } from '../upload/cloudinary.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly riderRepository: RiderRepository,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async getMe(userId: string) {
    this.logger.debug(`👨 Fetching user profile: ${userId}`);

    const user = await this.userRepository.findById(userId);
    if (!user) {
      this.logger.warn(`⚠️ User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.RIDER) {
      this.logger.debug(`📍 Fetching rider profile for: ${userId}`);
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
    this.logger.log(`🔐 Changing password for user: ${userId}`);

    try {
      const user = await this.userRepository.findByIdWithPassword(userId);

      if (!user) {
        this.logger.warn(`⚠️ User not found for password change: ${userId}`);
        throw new NotFoundException('User not found');
      }

      const isPasswordValid =
        user.passwordHash &&
        (await comparePassword(dto.currentPassword, user.passwordHash));

      if (!isPasswordValid) {
        this.logger.warn(`⚠️ Invalid current password for user: ${userId}`);
        throw new NotFoundException('Current password is incorrect');
      }

      const newHashedPassword = await hashPassword(dto.newPassword);

      await this.userRepository.update(userId, {
        passwordHash: newHashedPassword,
      });

      this.logger.log(`✅ Password changed successfully for user: ${userId}`);
    } catch (error) {
      this.logger.error(`❌ Password change failed for user ${userId}:`, error);
      throw error;
    }
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    profilePictureFile?: Express.Multer.File,
  ) {
    this.logger.log(`👤 Updating profile for user: ${userId}`);

    try {
      const updateData: Parameters<typeof this.userRepository.update>[1] = {
        ...dto,
      };

      if (profilePictureFile) {
        this.logger.debug(`📄 Uploading profile picture for user: ${userId}`);
        const uploaded = await this.cloudinary.uploadFile({
          file: profilePictureFile,
          folder: 'profile-pictures',
          resourceType: 'image',
        });

        this.logger.debug(`📄 Profile picture uploaded: ${uploaded.url}`);
        updateData.profilePicture = uploaded.url;
      }

      const result = await this.userRepository.update(userId, updateData);
      this.logger.log(`✅ Profile updated for user: ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Profile update failed for user ${userId}:`, error);
      throw error;
    }
  }
}
