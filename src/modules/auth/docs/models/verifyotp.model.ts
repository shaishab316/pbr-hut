import { ApiProperty } from '@nestjs/swagger';

class VerifyOtpBaseModel {
  @ApiProperty({
    description: '6-digit one-time password',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  otp!: string;

  @ApiProperty({
    description:
      'Reason for OTP verification. Controls which flow the backend executes after successful verification.',
    enum: ['register', 'forgot-password'],
    default: 'register',
    example: 'register',
  })
  flow!: 'register' | 'forgot-password';
}

export class VerifyOtpEmailRequest extends VerifyOtpBaseModel {
  @ApiProperty({
    description: 'Discriminator field — must be `email` for this variant.',
    enum: ['email'],
    example: 'email',
  })
  identifierType!: 'email';

  @ApiProperty({
    description: 'Email address to verify.',
    example: 'john@example.com',
    format: 'email',
  })
  email!: string;
}

export class VerifyOtpPhoneRequest extends VerifyOtpBaseModel {
  @ApiProperty({
    description: 'Discriminator field — must be `phone` for this variant.',
    enum: ['phone'],
    example: 'phone',
  })
  identifierType!: 'phone';

  @ApiProperty({
    description: 'Phone number in E.164 format (10–15 digits).',
    example: '+8801712345678',
  })
  phone!: string;
}
