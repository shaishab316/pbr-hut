import { CurrentUser } from '@/common/decorators';
import { JwtGuard } from '@/common/guards';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiGetMe } from './docs/user.docs';
import { UserService } from './user.service';

@UseGuards(JwtGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiGetMe()
  @Get('me')
  getMe(@CurrentUser('id') userId: string) {
    return this.userService.getMe(userId);
  }
}
