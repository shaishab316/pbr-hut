import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { UserRole, NotificationType } from '@prisma/client';
import { RiderRepository } from '../rider/repositories/rider.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import { comparePassword, hashPassword } from '@/common/helpers';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CloudinaryService } from '../upload/cloudinary.service';
import { NotificationService } from '@/modules/notification/notification.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly riderRepository: RiderRepository,
    private readonly cloudinary: CloudinaryService,
    private readonly notificationService: NotificationService,
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

      // 📬 Send notification about successful password change
      await this.notificationService.sendNotification(
        [userId],
        '🔐 Password Changed',
        'Your password has been changed successfully. If this was not you, please contact support.',
        NotificationType.INFO,
      );
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

      // 📬 Send notification about successful profile update
      const updateDetails = [] as string[];
      if (dto.name) updateDetails.push('name');
      if (dto.phone) updateDetails.push('phone');
      if (profilePictureFile) updateDetails.push('profile picture');

      const updateMessage =
        updateDetails.length > 0
          ? `Updated ${updateDetails.join(', ')}`
          : 'Profile updated';

      await this.notificationService.sendNotification(
        [userId],
        '👤 Profile Updated',
        `Your profile has been updated successfully. ${updateMessage}.`,
        NotificationType.INFO,
      );

      return result;
    } catch (error) {
      this.logger.error(`❌ Profile update failed for user ${userId}:`, error);
      throw error;
    }
  }
}
