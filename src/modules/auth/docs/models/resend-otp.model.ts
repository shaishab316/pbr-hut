import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpModel {
  @ApiProperty({
    description: 'Email or phone number used during sign up',
    example: 'john@example.com',
  })
  identifier!: string;
}
