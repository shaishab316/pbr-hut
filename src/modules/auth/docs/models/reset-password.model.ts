import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordRequest {
  @ApiProperty({
    description: 'Password reset token obtained after OTP verification.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token!: string;

  @ApiProperty({
    description: 'New password for the user.',
    example: 'MyNewP@ss123',
    minLength: 8,
    maxLength: 32,
  })
  newPassword!: string;
}
