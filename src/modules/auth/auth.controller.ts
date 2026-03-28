import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto, SignUpInput } from './dto/sign-up.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(200)
  async signUp(@Body() dto: SignUpDto) {
    const result = await this.authService.signUp(dto as unknown as SignUpInput);

    return result;
  }
}
