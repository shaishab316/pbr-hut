import { CurrentUser } from '@/common/decorators';
import { JwtGuard } from '@/common/guards';
import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { ApiGetMe } from './docs/user.docs';
import { UserService } from './user.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { createFileUploadInterceptor } from '../upload/interceptors/file-upload.interceptor';

const ProfilePictureUploadInterceptor = createFileUploadInterceptor({
  fields: [
    {
      name: 'profilePicture',
      maxCount: 1,
      maxFileSize: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
  ],
});

@UseGuards(JwtGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiGetMe()
  @Get('me')
  async getMe(@CurrentUser('id') userId: string) {
    const user = await this.userService.getMe(userId);

    return {
      message: `Welcome back, ${user.name}!`,
      data: user,
    };
  }

  @Post('change-password')
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.userService.changePassword(userId, dto);

    return {
      message: 'Password changed successfully',
    };
  }

  @Post('update-profile')
  @UseInterceptors(ProfilePictureUploadInterceptor)
  async updateProfile(
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: { profilePicture?: Express.Multer.File[] },
    @Body() dto: UpdateProfileDto,
  ) {
    const profilePictureFile = files?.profilePicture?.[0];
    const user = await this.userService.updateProfile(
      userId,
      dto,
      profilePictureFile,
    );

    return {
      message: 'Profile updated successfully',
      data: user,
    };
  }
}
