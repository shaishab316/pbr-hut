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
  Patch,
} from '@nestjs/common';
import { ApiGetMe } from './docs/user.docs';
import { UserService } from './user.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  UpdateProfileDto,
  updateProfileSchema,
} from './dto/update-profile.dto';
import { createFileUploadInterceptor } from '../upload/interceptors/file-upload.interceptor';
import { safeJsonParse } from '@/common/utils/safeJsonParse';
import { ZodValidationException } from 'nestjs-zod';
import {
  CacheKey,
  CacheTTL,
  InvalidateCache,
} from '@/common/decorators/cache.decorator';

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
  @CacheKey('user:me::user.id')
  @CacheTTL(300)
  async getMe(@CurrentUser('id') userId: string) {
    const user = await this.userService.getMe(userId);

    return {
      message: `Welcome back, ${user.name}!`,
      data: user,
    };
  }

  @Post('change-password')
  @InvalidateCache('user:me::user.id')
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.userService.changePassword(userId, dto);

    return {
      message: 'Password changed successfully',
    };
  }

  @Patch('update-profile')
  @UseInterceptors(ProfilePictureUploadInterceptor)
  @InvalidateCache('user:me::user.id')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: { profilePicture?: Express.Multer.File[] },
    @Body() body: any,
  ) {
    const raw: UpdateProfileDto = body['data']
      ? safeJsonParse(body['data'])
      : body;

    const dto = updateProfileSchema.safeParse(raw);

    if (!dto.success) {
      throw new ZodValidationException(dto.error);
    }

    const profilePictureFile = files?.profilePicture?.[0];
    const user = await this.userService.updateProfile(
      userId,
      dto.data,
      profilePictureFile,
    );

    return {
      message: 'Profile updated successfully',
      data: user,
    };
  }
}
