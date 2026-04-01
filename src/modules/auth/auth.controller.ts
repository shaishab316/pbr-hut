import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto, SignUpInput } from './dto/sign-up.dto';
import { VerifyOtpDto, VerifyOtpInput } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { LoginDto } from './dto/login.dto';
import {
  ApiForgotPassword,
  ApiLogin,
  ApiResendOtp,
  ApiResetPassword,
  ApiRiderSignUp,
  ApiCustomerSignUp,
  ApiVerifyOtp,
} from './docs';
import {
  ForgotPasswordDto,
  ForgotPasswordInput,
} from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RiderSignUpDto, RiderSignUpInput } from './dto/rider-sign-up.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiCustomerSignUp()
  @Post('register-customer')
  @HttpCode(200)
  async signUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto as unknown as SignUpInput);
  }

  @ApiRiderSignUp()
  @Post('register-rider')
  @HttpCode(200)
  async riderSignUp(@Body() dto: RiderSignUpDto) {
    return this.authService.riderSignUp(dto as unknown as RiderSignUpInput);
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

  @ApiForgotPassword()
  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(
      dto as unknown as ForgotPasswordInput,
    );
  }

  @ApiResetPassword()
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
