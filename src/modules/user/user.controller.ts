import { CurrentUser } from '@/common/decorators';
import { JwtGuard } from '@/common/guards';
import type { SafeUser } from '@/common/types/safe-user.type';
import { Controller, Get, UseGuards } from '@nestjs/common';

@UseGuards(JwtGuard)
@Controller('user')
export class UserController {
  @Get('me')
  getMe(@CurrentUser() user: SafeUser) {
    return user;
  }
}
