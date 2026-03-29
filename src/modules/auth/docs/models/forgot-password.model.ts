import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordEmailRequest {
  @ApiProperty({
    description: 'Discriminator field — must be `email` for this variant.',
    enum: ['email'],
    example: 'email',
  })
  identifierType!: 'email';

  @ApiProperty({
    description: 'Email address to send the OTP to.',
    example: 'john@example.com',
    format: 'email',
  })
  email!: string;
}

export class ForgotPasswordPhoneRequest {
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
