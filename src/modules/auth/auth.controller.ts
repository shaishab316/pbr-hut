import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto, SignUpInput } from './dto/sign-up.dto';
import { VerifyOtpDto, VerifyOtpInput } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { LoginDto } from './dto/login.dto';
import {
  ApiLogin,
  ApiResendOtp,
  ApiSignUp,
  ApiVerifyOtp,
} from './docs/auth.docs';
import {
  ForgotPasswordDto,
  ForgotPasswordInput,
} from './dto/forgot-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiSignUp()
  @Post('register')
  @HttpCode(200)
  async signUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto as unknown as SignUpInput);
  }

  @ApiVerifyOtp()
  @HttpCode(200)
  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto as unknown as VerifyOtpInput);
  }

  @ApiResendOtp()
  @Post('resend-otp')
  @HttpCode(200)
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @ApiLogin()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto as unknown as SignUpInput);
  }

  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(
      dto as unknown as ForgotPasswordInput,
    );
  }
}
