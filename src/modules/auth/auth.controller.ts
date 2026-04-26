import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto, SignUpInput } from './dto/sign-up.dto';
import {
  VerifyOtpDto,
  VerifyOtpFlow,
  VerifyOtpInput,
} from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  ApiForgotPassword,
  ApiLogin,
  ApiRefreshToken,
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
import { RiderSignUpDto } from './dto/rider-sign-up.dto';
import { AuthThrottle } from '@/common/decorators/throttle.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiCustomerSignUp()
  @AuthThrottle()
  @Post('register-customer')
  @HttpCode(200)
  async signUp(@Body() dto: SignUpDto) {
    const data = await this.authService.signUp(dto as unknown as SignUpInput);

    return { message: 'Otp sent successfully, please verify', data };
  }

  @ApiRiderSignUp()
  @AuthThrottle()
  @Post('register-rider')
  @HttpCode(200)
  async riderSignUp(@Body() dto: RiderSignUpDto) {
    const data = await this.authService.riderSignUp(dto);

    return { message: 'Otp sent successfully, please verify', data };
  }

  @ApiVerifyOtp()
  @AuthThrottle()
  @HttpCode(200)
  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const { data, flow } = await this.authService.verifyOtp(
      dto as unknown as VerifyOtpInput,
    );

    const messageMap: Record<VerifyOtpFlow, string> = {
      register: 'Account verified successfully',
      'forgot-password':
        'Otp verified successfully, you can now reset your password',
    };

    return {
      message: messageMap[flow],
      data,
    };
  }

  @ApiResendOtp()
  @AuthThrottle()
  @Post('resend-otp')
  @HttpCode(200)
  async resendOtp(@Body() dto: ResendOtpDto) {
    const data = await this.authService.resendOtp(dto);

    return { message: 'Otp sent successfully', data };
  }

  @ApiLogin()
  @AuthThrottle()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto as unknown as SignUpInput);

    return { message: 'Login successfully', data };
  }

  @ApiForgotPassword()
  @AuthThrottle()
  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const data = await this.authService.forgotPassword(
      dto as unknown as ForgotPasswordInput,
    );

    return { message: 'Password reset OTP sent', data };
  }

  @ApiResetPassword()
  @AuthThrottle()
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);

    return { message: 'Password reset successfully' };
  }

  @ApiRefreshToken()
  @AuthThrottle()
  @Post('refresh-token')
  @HttpCode(200)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    const data = await this.authService.refreshAccessToken(dto);

    return { message: 'Access token refreshed successfully', data };
  }
}
