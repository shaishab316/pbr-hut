import { CurrentUser } from '@/common/decorators';
import { JwtGuard } from '@/common/guards';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiGetMe } from './docs/user.docs';
import { UserService } from './user.service';
import { changePasswordDto } from './dto/change-password.dto';

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
    @Body() dto: changePasswordDto,
  ) {
    await this.userService.changePassword(userId, dto);

    return {
      message: 'Password changed successfully',
    };
  }
}
